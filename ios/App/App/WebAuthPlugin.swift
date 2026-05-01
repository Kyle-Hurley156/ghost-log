import Foundation
import AuthenticationServices
import Capacitor

/// Minimal Capacitor plugin that opens an ASWebAuthenticationSession.
/// Unlike SFSafariViewController (@capacitor/browser), ASWebAuthenticationSession
/// supports custom-scheme callbacks, so the deep link back to the app works on iOS.
@objc(WebAuthPlugin)
public class WebAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "WebAuthPlugin"
    public let jsName = "WebAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise)
    ]

    private var session: ASWebAuthenticationSession?

    /// Start an ASWebAuthenticationSession.
    /// JS call: WebAuth.start({ url: "https://...", callbackScheme: "com.ghostlog.app" })
    /// Resolves with { url: "com.ghostlog.app://..." } on success.
    @objc func start(_ call: CAPPluginCall) {
        guard let urlString = call.getString("url"),
              let url = URL(string: urlString) else {
            call.reject("Missing or invalid 'url'")
            return
        }

        let scheme = call.getString("callbackScheme") ?? "com.ghostlog.app"

        DispatchQueue.main.async { [weak self] in
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: scheme) { callbackURL, error in
                self?.session = nil
                if let error = error {
                    let nsError = error as NSError
                    // Code 1 = user cancelled
                    if nsError.domain == ASWebAuthenticationSessionErrorDomain,
                       nsError.code == ASWebAuthenticationSessionError.canceledLogin.rawValue {
                        call.reject("User cancelled", "CANCELLED")
                    } else {
                        call.reject(error.localizedDescription, "SESSION_ERROR")
                    }
                    return
                }
                if let url = callbackURL {
                    call.resolve(["url": url.absoluteString])
                } else {
                    call.reject("No callback URL received", "NO_URL")
                }
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self?.session = session
            session.start()
        }
    }

    // MARK: - ASWebAuthenticationPresentationContextProviding
    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return bridge?.webView?.window ?? UIWindow()
    }
}
