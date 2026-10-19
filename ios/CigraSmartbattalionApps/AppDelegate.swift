import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import GoogleMaps
import FirebaseCore

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  /// Samakan dengan `--port` di script package.json dan `reactNativeDevServerPort` di android/gradle.properties.
  static let metroPort = 8001

  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // react-native-firebase tidak meng-configure app default di iOS. Dilewati selama
    // GoogleService-Info.plist belum ada (belum didaftarkan di Firebase Console) supaya app tidak crash.
    if Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil {
      FirebaseApp.configure()
    }

    if let mapsApiKey = RNCConfig.env(for: "MAPS_API_KEY"), !mapsApiKey.isEmpty {
      GMSServices.provideAPIKey(mapsApiKey)
    }

#if DEBUG
    // Port Metro 8001 (bukan 8081) supaya bisa jalan bersamaan dengan Smart Academy (8002). React Core
    // iOS dipakai prebuilt, jadi build setting RCT_METRO_PORT tidak berlaku — host:port diset di sini.
    // Device fisik memakai IP Mac dari ip.txt (ditulis script bundling RN), simulator pakai localhost.
    let metroHost = Bundle.main.path(forResource: "ip", ofType: "txt")
      .flatMap { try? String(contentsOfFile: $0, encoding: .utf8) }?
      .trimmingCharacters(in: .whitespacesAndNewlines)
    RCTBundleURLProvider.sharedSettings().jsLocation =
      "\(metroHost.flatMap { $0.isEmpty ? nil : $0 } ?? "localhost"):\(AppDelegate.metroPort)"
#endif

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    // Window + React root dibuat di SceneDelegate: SDK iOS 27 wajib UIScene lifecycle
    // (tanpa itu app langsung crash saat launch, `UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`).
    return true
  }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else { return }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Beberapa library masih membaca `UIApplication.shared.delegate.window`.
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "CigraSmartbattalionApps",
      in: window,
      launchOptions: nil
    )
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
