// Pelacakan lokasi latar belakang iOS — padanan LocationForegroundService.kt + LocationTrackingModule.kt
// + TrackingPrefs.kt + BootReceiver.kt di Android. JS: src/native/locationTracking.ts.
//
// iOS tidak punya foreground service: app tetap hidup di background selama CLLocationManager
// menjalankan update standar dengan allowsBackgroundLocationUpdates (butuh UIBackgroundModes
// `location` di Info.plist), jadi timer upload 45 detik tetap berjalan. Significant-change ikut
// dinyalakan supaya iOS meluncurkan ulang app di background kalau prosesnya sempat dimatikan —
// saat itu +load di bawah menyalakan lagi pelacakan (pengganti BootReceiver). Token + fix terakhir
// disimpan di NSUserDefaults (pengganti TrackingPrefs) karena JS/bridge belum tentu hidup.

#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

#import "RNCConfig.h"

static NSString *const kTag = @"[LocationTracking]";
static NSString *const kKeyAuthToken = @"location_tracking.auth_token";
static NSString *const kKeyTrackingEnabled = @"location_tracking.tracking_enabled";
static NSString *const kKeyLastLocation = @"location_tracking.last_location";

static const int64_t kUploadIntervalSeconds = 45;
static const NSTimeInterval kRequestTimeoutSeconds = 15;
static const NSTimeInterval kStaleFixThresholdSeconds = 120;

#pragma mark - Penyimpanan (padanan TrackingPrefs)

static NSUserDefaults *TrackingDefaults(void)
{
  return [NSUserDefaults standardUserDefaults];
}

static NSString *StoredAuthToken(void)
{
  NSString *token = [TrackingDefaults() stringForKey:kKeyAuthToken];
  return token.length > 0 ? token : nil;
}

static void SetStoredAuthToken(NSString *token)
{
  if (token.length > 0) {
    [TrackingDefaults() setObject:token forKey:kKeyAuthToken];
  } else {
    [TrackingDefaults() removeObjectForKey:kKeyAuthToken];
  }
}

static BOOL IsTrackingEnabled(void)
{
  return [TrackingDefaults() boolForKey:kKeyTrackingEnabled];
}

static void SetTrackingEnabled(BOOL enabled)
{
  [TrackingDefaults() setBool:enabled forKey:kKeyTrackingEnabled];
}

// Disimpan (bukan cuma di memori) supaya getLastLocation tetap terbaca JS walau proses app sempat
// diluncurkan ulang. `accuracy` NSNull kalau iOS menandai fix-nya tidak valid (horizontalAccuracy < 0).
static void SetStoredLastLocation(CLLocation *location)
{
  [TrackingDefaults() setObject:@{
    @"latitude" : @(location.coordinate.latitude),
    @"longitude" : @(location.coordinate.longitude),
    @"accuracy" : location.horizontalAccuracy >= 0 ? @(location.horizontalAccuracy) : [NSNull null],
    @"time" : @(floor(location.timestamp.timeIntervalSince1970 * 1000)),
  }
                         forKey:kKeyLastLocation];
}

#pragma mark - Tracker (padanan LocationForegroundService)

@interface LocationTracker : NSObject <CLLocationManagerDelegate>
@property (atomic, strong) CLLocation *lastLocation;
+ (instancetype)shared;
- (void)start;
- (void)stop;
@end

@implementation LocationTracker {
  CLLocationManager *_manager; // hanya disentuh di main thread
  dispatch_queue_t _uploadQueue;
  dispatch_source_t _timer;
  BOOL _running;
}

+ (instancetype)shared
{
  static LocationTracker *instance;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    instance = [LocationTracker new];
  });
  return instance;
}

// Pengganti BootReceiver: saat iOS meluncurkan ulang app (termasuk di background karena event
// significant-change), nyalakan lagi pelacakan kalau masih aktif dan masih ada token.
+ (void)load
{
  [[NSNotificationCenter defaultCenter] addObserverForName:UIApplicationDidFinishLaunchingNotification
                                                    object:nil
                                                     queue:[NSOperationQueue mainQueue]
                                                usingBlock:^(NSNotification *note) {
                                                  if (IsTrackingEnabled() && StoredAuthToken() != nil) {
                                                    NSLog(@"%@ Melanjutkan pelacakan saat launch", kTag);
                                                    [[LocationTracker shared] start];
                                                  }
                                                }];
}

- (instancetype)init
{
  if (self = [super init]) {
    _uploadQueue = dispatch_queue_create("com.cigrasmartbattalionapps.location-upload", DISPATCH_QUEUE_SERIAL);
  }
  return self;
}

- (void)start
{
  NSAssert([NSThread isMainThread], @"LocationTracker start harus di main thread");
  if (_running) {
    return;
  }
  if (!_manager) {
    _manager = [CLLocationManager new];
    _manager.delegate = self;
  }

  CLAuthorizationStatus status = _manager.authorizationStatus;
  if (status != kCLAuthorizationStatusAuthorizedAlways && status != kCLAuthorizationStatusAuthorizedWhenInUse) {
    NSLog(@"%@ Izin lokasi belum diberikan (status %d), pelacakan tidak dimulai", kTag, (int)status);
    return;
  }
  _running = YES;

  // NearestTenMeters + tanpa filter jarak, sama seperti GPS_PROVIDER + MIN_UPDATE_DISTANCE_M = 0 di
  // Android: tombol darurat memakai fix terakhir kalau <= 1 menit & <= 50 m (getRecentTrackedCoordinates).
  _manager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters;
  _manager.distanceFilter = kCLDistanceFilterNone;
  _manager.activityType = CLActivityTypeOther;
  _manager.pausesLocationUpdatesAutomatically = NO;
  _manager.allowsBackgroundLocationUpdates = YES;

  CLLocation *seed = _manager.location;
  if (seed != nil && seed.horizontalAccuracy >= 0) {
    [self updateLastLocation:seed];
  }
  [_manager startUpdatingLocation];
  if ([CLLocationManager significantLocationChangeMonitoringAvailable]) {
    [_manager startMonitoringSignificantLocationChanges];
  }
  [self startUploadLoop];
  NSLog(@"%@ Pelacakan dimulai", kTag);
}

- (void)stop
{
  NSAssert([NSThread isMainThread], @"LocationTracker stop harus di main thread");
  if (!_running) {
    return;
  }
  _running = NO;
  [_manager stopUpdatingLocation];
  [_manager stopMonitoringSignificantLocationChanges];
  _manager.allowsBackgroundLocationUpdates = NO;
  if (_timer) {
    dispatch_source_cancel(_timer);
    _timer = nil;
  }
  NSLog(@"%@ Pelacakan dihentikan", kTag);
}

- (void)updateLastLocation:(CLLocation *)location
{
  self.lastLocation = location;
  SetStoredLastLocation(location);
}

// Adaptasi isMoreUsefulLocation di LocationForegroundService.kt (iOS tidak punya konsep provider,
// jadi semua fix dianggap dari provider yang sama).
- (BOOL)isMoreUsefulLocation:(CLLocation *)newLocation than:(CLLocation *)current
{
  NSTimeInterval timeDelta = [newLocation.timestamp timeIntervalSinceDate:current.timestamp];
  if (timeDelta > kStaleFixThresholdSeconds) {
    return YES;
  }
  if (timeDelta < -kStaleFixThresholdSeconds) {
    return NO;
  }
  return newLocation.horizontalAccuracy - current.horizontalAccuracy <= 200;
}

#pragma mark CLLocationManagerDelegate

- (void)locationManager:(CLLocationManager *)manager didUpdateLocations:(NSArray<CLLocation *> *)locations
{
  CLLocation *location = locations.lastObject;
  if (location == nil || location.horizontalAccuracy < 0) {
    return;
  }
  CLLocation *current = self.lastLocation;
  if (current == nil || [self isMoreUsefulLocation:location than:current]) {
    [self updateLastLocation:location];
  }
}

- (void)locationManager:(CLLocationManager *)manager didFailWithError:(NSError *)error
{
  // kCLErrorLocationUnknown hanya sementara — CoreLocation terus mencoba sendiri.
  if (error.code != kCLErrorLocationUnknown) {
    NSLog(@"%@ Update lokasi gagal: %@", kTag, error);
  }
}

#pragma mark Upload

- (void)startUploadLoop
{
  _timer = dispatch_source_create(DISPATCH_SOURCE_TYPE_TIMER, 0, 0, _uploadQueue);
  dispatch_source_set_timer(
      _timer, dispatch_time(DISPATCH_TIME_NOW, 0), kUploadIntervalSeconds * NSEC_PER_SEC, 5 * NSEC_PER_SEC);
  __weak LocationTracker *weakSelf = self;
  dispatch_source_set_event_handler(_timer, ^{
    [weakSelf uploadCurrentLocation];
  });
  dispatch_resume(_timer);
}

// Jalan di _uploadQueue (serial), jadi upload + refresh tidak pernah tumpang tindih.
- (void)uploadCurrentLocation
{
  CLLocation *location = self.lastLocation;
  NSString *token = StoredAuthToken();
  if (location == nil || token == nil) {
    return;
  }

  // Beri waktu request selesai kalau iOS akan men-suspend app tepat saat upload berjalan.
  UIApplication *app = [UIApplication sharedApplication];
  __block UIBackgroundTaskIdentifier task = [app beginBackgroundTaskWithName:@"LocationUpload"
                                                           expirationHandler:^{
                                                             [app endBackgroundTask:task];
                                                             task = UIBackgroundTaskInvalid;
                                                           }];

  NSInteger code = [self performUpload:location token:token];
  if (code >= 200 && code < 300) {
    NSLog(@"%@ Upload lokasi OK (%.6f, %.6f)", kTag, location.coordinate.latitude, location.coordinate.longitude);
  } else if (code == 401) {
    [self handleUnauthorizedForLocation:location token:token];
  }

  if (task != UIBackgroundTaskInvalid) {
    [app endBackgroundTask:task];
  }
}

- (void)handleUnauthorizedForLocation:(CLLocation *)location token:(NSString *)token
{
  // JS (axiosInstance) bisa sudah merotasi token & menyinkronkannya ke sini selagi upload ini
  // berjalan — token lama itu sudah mati, jadi jangan refresh / hapus token baru; pakai di putaran berikut.
  if (![token isEqualToString:StoredAuthToken() ?: @""]) {
    return;
  }

  // Skema JWT-refresh yang sama dengan axiosInstance: token lama sebagai Bearer, tanpa body.
  NSString *newToken = [self refreshToken:token];
  if (newToken == nil) {
    // Refresh ditolak — tidak ada gunanya polling terus dengan token invalid. Sesi resmi ke-logout
    // dari sisi JS begitu app dibuka lagi dan refresh di axiosInstance gagal dengan cara yang sama.
    if ([token isEqualToString:StoredAuthToken() ?: @""]) {
      SetStoredAuthToken(nil);
    }
    dispatch_async(dispatch_get_main_queue(), ^{
      [self stop];
    });
    return;
  }

  SetStoredAuthToken(newToken);
  NSLog(@"%@ Token di-refresh dari native", kTag);
  NSInteger retryCode = [self performUpload:location token:newToken];
  if (retryCode >= 200 && retryCode < 300) {
    NSLog(@"%@ Upload lokasi OK setelah refresh token", kTag);
  } else {
    NSLog(@"%@ Upload lokasi gagal setelah refresh token, kode: %ld", kTag, (long)retryCode);
  }
}

- (NSURL *)urlForPath:(NSString *)path
{
  NSString *base = [RNCConfig envFor:@"API_BASE_URL"];
  if (base.length == 0) {
    return nil;
  }
  return [NSURL URLWithString:[base stringByAppendingString:path]];
}

// Request sinkron (dipanggil hanya dari _uploadQueue). Mengembalikan HTTP status, atau -1 kalau
// gagal di level jaringan.
- (NSInteger)sendRequest:(NSURLRequest *)request responseBody:(NSData **)responseBody
{
  dispatch_semaphore_t done = dispatch_semaphore_create(0);
  __block NSInteger status = -1;
  __block NSData *body = nil;
  NSURLSessionDataTask *dataTask = [[NSURLSession sharedSession]
      dataTaskWithRequest:request
        completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
          if (error != nil) {
            NSLog(@"%@ Request %@ error: %@", kTag, request.URL.path, error.localizedDescription);
          } else if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
            status = ((NSHTTPURLResponse *)response).statusCode;
            body = data;
          }
          dispatch_semaphore_signal(done);
        }];
  [dataTask resume];
  dispatch_semaphore_wait(done, DISPATCH_TIME_FOREVER);
  if (responseBody != NULL) {
    *responseBody = body;
  }
  return status;
}

- (NSInteger)performUpload:(CLLocation *)location token:(NSString *)token
{
  NSURL *url = [self urlForPath:@"/locations"];
  if (url == nil) {
    NSLog(@"%@ API_BASE_URL kosong, upload dilewati", kTag);
    return -1;
  }

  NSMutableDictionary *payload = [@{
    @"latitude" : @(location.coordinate.latitude),
    @"longitude" : @(location.coordinate.longitude),
  } mutableCopy];
  if (location.horizontalAccuracy >= 0) {
    payload[@"accuracy"] = @(location.horizontalAccuracy);
  }
  if (location.verticalAccuracy >= 0) {
    payload[@"altitude"] = @(location.altitude);
  }
  if (location.course >= 0) {
    payload[@"heading"] = @(location.course);
  }
  if (location.speed >= 0) {
    payload[@"speed"] = @(location.speed);
  }
  NSString *version = [NSBundle mainBundle].infoDictionary[@"CFBundleShortVersionString"] ?: @"";
  payload[@"source"] = [@"mobile-v" stringByAppendingString:version];

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url
                                                         cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
                                                     timeoutInterval:kRequestTimeoutSeconds];
  request.HTTPMethod = @"POST";
  [request setValue:@"application/json" forHTTPHeaderField:@"Content-Type"];
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [request setValue:[@"Bearer " stringByAppendingString:token] forHTTPHeaderField:@"Authorization"];
  request.HTTPBody = [NSJSONSerialization dataWithJSONObject:payload options:0 error:nil];

  NSData *responseBody = nil;
  NSInteger code = [self sendRequest:request responseBody:&responseBody];
  if (code != -1 && (code < 200 || code >= 300)) {
    NSString *text = responseBody ? [[NSString alloc] initWithData:responseBody encoding:NSUTF8StringEncoding] : nil;
    NSLog(@"%@ Upload lokasi gagal, kode: %ld, body: %@", kTag, (long)code, text);
  }
  return code;
}

- (NSString *)refreshToken:(NSString *)oldToken
{
  NSURL *url = [self urlForPath:@"/auth/refresh"];
  if (url == nil) {
    return nil;
  }
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url
                                                         cachePolicy:NSURLRequestReloadIgnoringLocalCacheData
                                                     timeoutInterval:kRequestTimeoutSeconds];
  request.HTTPMethod = @"POST";
  [request setValue:@"application/json" forHTTPHeaderField:@"Accept"];
  [request setValue:[@"Bearer " stringByAppendingString:oldToken] forHTTPHeaderField:@"Authorization"];

  NSData *responseBody = nil;
  NSInteger code = [self sendRequest:request responseBody:&responseBody];
  id json = responseBody ? [NSJSONSerialization JSONObjectWithData:responseBody options:0 error:nil] : nil;
  if ([json isKindOfClass:[NSDictionary class]] && [json[@"success"] isEqual:@YES]) {
    id data = json[@"data"];
    id accessToken = [data isKindOfClass:[NSDictionary class]] ? data[@"access_token"] : nil;
    if ([accessToken isKindOfClass:[NSString class]] && [accessToken length] > 0) {
      return accessToken;
    }
  }
  NSString *text = responseBody ? [[NSString alloc] initWithData:responseBody encoding:NSUTF8StringEncoding] : nil;
  NSLog(@"%@ Refresh token ditolak backend, kode: %ld, body: %@", kTag, (long)code, text);
  return nil;
}

@end

#pragma mark - Modul RN (padanan LocationTrackingModule.kt)

@interface LocationTrackingModule : NSObject <RCTBridgeModule>
@end

@implementation LocationTrackingModule

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

RCT_EXPORT_METHOD(startTracking : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  SetTrackingEnabled(YES);
  [[LocationTracker shared] start];
  resolve(nil);
}

RCT_EXPORT_METHOD(stopTracking : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  SetTrackingEnabled(NO);
  [[LocationTracker shared] stop];
  resolve(nil);
}

RCT_EXPORT_METHOD(getLastLocation : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  NSDictionary *stored = [TrackingDefaults() dictionaryForKey:kKeyLastLocation];
  resolve(stored ?: [NSNull null]);
}

RCT_EXPORT_METHOD(syncAuthToken : (nullable NSString *)token)
{
  SetStoredAuthToken(token);
}

RCT_EXPORT_METHOD(getStoredAuthToken : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  resolve(StoredAuthToken() ?: [NSNull null]);
}

RCT_EXPORT_METHOD(isLocationServicesEnabled : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  // locationServicesEnabled memblok & memicu peringatan kalau dipanggil di main thread.
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    resolve(@([CLLocationManager locationServicesEnabled]));
  });
}

@end
