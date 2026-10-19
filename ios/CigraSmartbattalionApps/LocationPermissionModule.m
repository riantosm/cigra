// Izin lokasi iOS untuk layar AppBootstrap (padanan PermissionsAndroid FINE/BACKGROUND_LOCATION).
// @react-native-community/geolocation tidak bisa membedakan "Saat Digunakan" vs "Selalu" dan
// callback requestAuthorization-nya menggantung kalau status tidak berubah, jadi dibuat sendiri.
// JS: src/native/locationPermission.ts.

#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>
#import <UIKit/UIKit.h>

@interface LocationPermissionModule : NSObject <RCTBridgeModule, CLLocationManagerDelegate>
@end

@implementation LocationPermissionModule {
  CLLocationManager *_manager;
  NSMutableArray<RCTPromiseResolveBlock> *_pending;
  BOOL _appResignedSinceRequest;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (instancetype)init
{
  if (self = [super init]) {
    _pending = [NSMutableArray new];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appWillResignActive)
                                                 name:UIApplicationWillResignActiveNotification
                                               object:nil];
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(appDidBecomeActive)
                                                 name:UIApplicationDidBecomeActiveNotification
                                               object:nil];
  }
  return self;
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (CLLocationManager *)manager
{
  if (!_manager) {
    _manager = [CLLocationManager new];
    _manager.delegate = self;
  }
  return _manager;
}

- (NSString *)currentStatus
{
  switch (self.manager.authorizationStatus) {
    case kCLAuthorizationStatusAuthorizedAlways:
      return @"always";
    case kCLAuthorizationStatusAuthorizedWhenInUse:
      return @"whenInUse";
    case kCLAuthorizationStatusDenied:
      return @"denied";
    case kCLAuthorizationStatusRestricted:
      return @"restricted";
    default:
      return @"notDetermined";
  }
}

- (void)flushPending
{
  if (_pending.count == 0) {
    return;
  }
  NSString *status = [self currentStatus];
  NSArray<RCTPromiseResolveBlock> *resolvers = [_pending copy];
  [_pending removeAllObjects];
  for (RCTPromiseResolveBlock resolve in resolvers) {
    resolve(status);
  }
}

RCT_EXPORT_METHOD(getStatus : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  resolve([self currentStatus]);
}

RCT_EXPORT_METHOD(isLocationServicesEnabled : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    resolve(@([CLLocationManager locationServicesEnabled]));
  });
}

// level: "whenInUse" | "always". Resolve dengan status setelah pengguna menjawab dialog — atau
// langsung dengan status sekarang kalau iOS tidak menampilkan dialog (sudah pernah ditanya / ditolak).
RCT_EXPORT_METHOD(request : (NSString *)level resolve : (RCTPromiseResolveBlock)resolve reject : (RCTPromiseRejectBlock)reject)
{
  CLAuthorizationStatus status = self.manager.authorizationStatus;
  BOOL wantsAlways = [level isEqualToString:@"always"];

  BOOL satisfied = status == kCLAuthorizationStatusAuthorizedAlways ||
      (!wantsAlways && status == kCLAuthorizationStatusAuthorizedWhenInUse);
  BOOL blocked = status == kCLAuthorizationStatusDenied || status == kCLAuthorizationStatusRestricted;
  if (satisfied || blocked) {
    resolve([self currentStatus]);
    return;
  }

  [_pending addObject:resolve];
  _appResignedSinceRequest = NO;
  if (wantsAlways) {
    [self.manager requestAlwaysAuthorization];
  } else {
    [self.manager requestWhenInUseAuthorization];
  }

  // iOS hanya sekali menampilkan dialog upgrade ke "Selalu". Kalau dialog tidak muncul, app tidak
  // pernah inactive dan delegate tidak dipanggil — selesaikan dengan status apa adanya.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (!self->_appResignedSinceRequest) {
      [self flushPending];
    }
  });
}

- (void)appWillResignActive
{
  _appResignedSinceRequest = YES;
}

- (void)appDidBecomeActive
{
  // Dialog izin ditutup. Kalau statusnya tidak berubah (mis. upgrade "Selalu" ditolak), delegate
  // tidak terpanggil — beri jeda singkat untuk delegate lalu selesaikan.
  // Masih notDetermined = dialog izin lokasi belum dijawab (app sempat inactive karena hal lain, mis.
  // prompt "Save Password" iOS atau reload) — tetap tunggu delegate.
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.5 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
    if (self.manager.authorizationStatus != kCLAuthorizationStatusNotDetermined) {
      [self flushPending];
    }
  });
}

- (void)locationManagerDidChangeAuthorization:(CLLocationManager *)manager
{
  if (manager.authorizationStatus != kCLAuthorizationStatusNotDetermined) {
    [self flushPending];
  }
}

@end
