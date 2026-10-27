---
title: "Security & App Publishing"
description: "Best practices for securing Android apps and navigating the Play Store release process."
---

## 1. How do R8 and ProGuard work for code shrinking, obfuscation, and optimization?
R8 (the modern default) and ProGuard are compilers used during the release build process.
- **Shrinking**: They analyze the code graph and remove any unused classes, methods, or resources, dramatically reducing the APK size.
- **Obfuscation**: They rename the remaining classes and variables to short, meaningless names (e.g., `class MainActivity` becomes `class a`), making it incredibly difficult for attackers to reverse-engineer your APK.
- **Optimization**: They rewrite code to be more efficient (e.g., removing dead `if` branches or inlining functions).

**R8 replaced ProGuard as the default from AGP 3.4.** The architectural difference: ProGuard was a separate pass over class files, after which D8 produced DEX. R8 **fuses shrinking, optimisation, obfuscation and dexing into one pass**, which is faster and produces smaller output. It deliberately reads the same `proguard-rules.pro` syntax, so migration required no changes for most projects.

```groovy
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true      // needs minifyEnabled — usage is derived from shrunk code
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
                      'proguard-rules.pro'
    }
}
```

Note the **`-optimize`** variant of the default file; the plain one disables optimisations.

**The security framing deserves honesty**, and this is where a good answer separates itself: **obfuscation is not a security control.** It raises the cost of reverse-engineering; it does not prevent it. Tools like `jadx` recover readable structure in seconds, and strings, endpoints, resource names and overall logic survive renaming intact.

So **never treat obfuscation as protection for secrets.** An API key compiled into your APK is extractable no matter what R8 does to the surrounding code. The only real answer for secrets is to keep them server-side (question 9).

What obfuscation *does* genuinely buy you: it slows casual tampering and cloning, it makes automated analysis of your codebase harder, and — often underrated — the **size reduction is itself a user-facing win**.

**The operational cost is unreadable crash reports.** Upload `mapping.txt` (from `build/outputs/mapping/release/`) to Play Console or Crashlytics, and keep the line-number attributes or even that won't help:

```proguard
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
```

**The risk** is that R8 reasons about *static* reachability, so anything reached by reflection — JSON models, custom views from XML, JNI methods, `Parcelable` CREATORs — can be stripped or renamed. These bugs appear **only in release builds**, which is why testing a release build before shipping is mandatory, not optional.

## 2. What is an Android App Bundle (AAB), and how does it differ from a standard APK?
An APK (Android Package) contains all compiled code and resources for *every* device configuration (all languages, all screen densities, all CPU architectures).
An AAB is a publishing format uploaded to the Google Play Store. Google Play uses the AAB to generate and serve optimized, device-specific APKs. When a user downloads the app, they only download the resources explicitly needed for their specific device (e.g., only English strings and xhdpi graphics), saving massive amounts of user bandwidth and storage.

**The key distinction: an APK is what a device *installs and runs*; an AAB is what you *upload*.** A device can never install an `.aab` directly. Since August 2021, AAB has been **mandatory** for new apps on Google Play.

**What Play generates from it:** a base APK plus **split APKs** along three dimensions — ABI, screen density, and language — and delivers only the slices a given device needs. A phone on `arm64` at `xxhdpi` in English downloads no x86 libraries, no other density buckets, and no other languages. Typical savings are **15–50%**.

```bash
./gradlew bundleRelease

# Test locally — bundletool produces the same splits Play would
bundletool build-apks --bundle=app-release.aab --output=app.apks --connected-device
bundletool install-apks --apks=app.apks
```

**Two consequences that catch teams out:**

1. **App signing moves to Google.** With Play App Signing, Google holds the real signing key and you sign the bundle with an **upload key**. The upside is that a lost upload key is recoverable (Google re-keys you) rather than fatal. The downside is that you no longer control the final binary's signature — which matters if you distribute the same app outside Play, since those builds will have a different signature.
2. **Testing changes shape.** The installed artefact is now a *set* of splits, so bugs can appear that don't reproduce with a universal APK — missing resources, `Resources$NotFoundException`, or a missing native library for one ABI. Use `bundletool` or Play's **internal app sharing** to test what users actually get.

**AAB also unlocks** dynamic feature modules (question 10) and **Play Asset Delivery** for large game assets.

**You still build APKs** for everything outside Play: sideloading, CI artefacts, F-Droid, Amazon Appstore, enterprise MDM distribution. `./gradlew assembleRelease` remains the command for those.

## 3. What is the Android KeyStore system, and how do you securely store cryptographic keys?
The Android KeyStore protects cryptographic keys by storing them in a secure hardware container (Trusted Execution Environment) separate from the main Android OS. Once a key is generated inside the KeyStore, its raw key material can *never* be extracted or read by your app (or attackers). Your app simply asks the KeyStore to perform encryption/decryption operations using the secure key.

**The central idea is that you never hold the key.** Your app gets a *handle*; the cryptographic operation happens inside the secure hardware. Even a fully compromised app process with root cannot read the key material — it can only ask for operations while it has access. That's a qualitatively stronger guarantee than "the key is encrypted somewhere."

**Three tiers of hardware backing**, worth distinguishing:

- **Software-only** — keys protected by the OS but not by separate hardware. The weakest; a rooted device can extract them.
- **TEE (Trusted Execution Environment)** — a secure world running alongside Android on the same CPU.
- **StrongBox** (API 28+) — a discrete, tamper-resistant secure element with its own CPU and memory. The strongest, and not present on all devices.

You can request StrongBox and check what you actually got via `KeyInfo.isInsideSecureHardware`.

```kotlin
val spec = KeyGenParameterSpec.Builder("my_key",
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setUserAuthenticationRequired(true)          // gate on biometric/PIN
    .setInvalidatedByBiometricEnrollment(true)    // new fingerprint → key dies
    .setIsStrongBoxBacked(true)                   // prefer StrongBox if available
    .build()

KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
    .apply { init(spec) }.generateKey()
```

**`setUserAuthenticationRequired(true)` is what ties crypto to biometrics** — the key simply won't perform operations until the user authenticates, which is far stronger than checking a boolean after a biometric prompt returns.

**For most app-level needs, use Jetpack Security rather than raw KeyStore**, which handles key generation, rotation and IV management for you:

```kotlin
val masterKey = MasterKey.Builder(context)
    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()

val prefs = EncryptedSharedPreferences.create(
    context, "secure_prefs", masterKey,
    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
)
```

**Caveats to know:** keys are **lost** if the user removes their screen lock, on some devices after biometric re-enrolment, and always on app uninstall or factory reset — so design for key loss (re-authenticate and re-provision, don't lose the user's data). And note the KeyStore protects **keys**, not arbitrary data: you still encrypt your data yourself using a KeyStore-held key.

## 4. How do runtime permissions work, and what are dangerous permissions?
Android categorizes permissions based on privacy risk.
- **Normal Permissions** (e.g., Internet): Granted automatically at install time.
- **Dangerous Permissions** (e.g., Location, Camera, Contacts): Require explicit user consent at runtime. You must call `requestPermissions()`, explain why you need it, and gracefully handle cases where the user denies the request.

**There's a third category worth naming: signature permissions**, granted only to apps signed with the same key as the declaring app. That's how an app suite shares privileged capability without exposing it to everyone.

**The complete flow has three branches**, and handling only the happy path is the common failure:

```kotlin
private val requestPermission = registerForActivityResult(
    ActivityResultContracts.RequestPermission()
) { granted -> if (granted) openCamera() else showDeniedUi() }

private fun onCameraClicked() {
    when {
        ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
            == PackageManager.PERMISSION_GRANTED -> openCamera()

        shouldShowRequestPermissionRationale(Manifest.permission.CAMERA) ->
            showRationale { requestPermission.launch(Manifest.permission.CAMERA) }

        else -> requestPermission.launch(Manifest.permission.CAMERA)
    }
}
```

The launcher must be registered at **field-initialisation time**, not inside a click handler.

**Detecting permanent denial** has no direct API — you infer it. Not granted, `shouldShowRequestPermissionRationale` returns `false`, and you've asked before ⇒ permanently denied, and further requests silently return denied. Link the user to app settings instead:

```kotlin
startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
    Uri.fromParts("package", packageName, null)))
```

**Three rules for production:**

1. **Check every time, never cache.** The user can revoke from Settings while you're backgrounded (which also restarts your process).
2. **Ask in context**, at the moment the feature is used. Grant rates are dramatically higher than a wall of dialogs at launch.
3. **Degrade gracefully.** A denial should disable one feature, not break the app.

**The modern tightenings**, which show you're current: Android 11+ treats two denials as permanent (the "Don't ask again" checkbox is gone); one-time grants ("Only this time") expire; unused permissions are **auto-revoked** for dormant apps; background location must be requested *separately and afterwards*, and sends the user to Settings on Android 11+; Android 13 split storage into `READ_MEDIA_IMAGES`/`VIDEO`/`AUDIO` and made `POST_NOTIFICATIONS` a runtime permission; Android 14 added partial photo access.

**The best permission is the one you don't request.** The Photo Picker and `ACTION_IMAGE_CAPTURE` both deliver what most apps need with **no permission at all** — and Play now requires written justification for sensitive permissions, so each one you drop is one less policy risk.

## 5. What is Play Integrity API (formerly SafetyNet), and why is it used?
The Play Integrity API is an anti-abuse system. Your app requests an integrity token, which you send to your backend. Your backend verifies the token with Google's servers. 
It confirms three things:
1. The app binary is genuine and unmodified (not a tampered/cracked APK).
2. The Android OS is genuine and not rooted or compromised.
3. The app was installed from Google Play.

**The architectural point that matters most: verification must happen on your server, never in the app.** An attacker who has modified your APK controls every client-side check — they simply patch out the `if (integrityOk)`. The token is only meaningful because it is signed by Google and verified by a party the attacker doesn't control.

```kotlin
val manager = IntegrityManagerFactory.create(context)
manager.requestIntegrityToken(
    IntegrityTokenRequest.builder()
        .setNonce(nonceFromYourServer)      // server-generated, single-use
        .build()
).addOnSuccessListener { response ->
    api.verify(response.token())            // → your backend → Google → verdict
}
```

**The nonce must come from your server and be single-use**, otherwise an attacker captures one valid token and replays it indefinitely. This is the most commonly botched part of the integration.

**The verdicts you get back:**

- **`appRecognitionVerdict`** — `PLAY_RECOGNIZED` (unmodified, Play-installed), `UNRECOGNIZED_VERSION` (modified or sideloaded), `UNEVALUATED`.
- **`deviceRecognitionVerdict`** — `MEETS_DEVICE_INTEGRITY`, `MEETS_BASIC_INTEGRITY`, `MEETS_STRONG_INTEGRITY` (hardware-backed), or empty (rooted/emulated/compromised).
- **`appLicensingVerdict`** — `LICENSED` (a genuine Play entitlement) or `UNLICENSED`.

**Where it's genuinely used:** payments and banking, anti-cheat in games, protecting limited promotions from bot abuse, and gating high-value API endpoints.

**Be measured about its limits**, which is what a thoughtful answer adds:

- It is **anti-abuse, not security**. It raises cost; determined attackers with modified devices still defeat it.
- **False positives have real user cost** — custom ROM users, rooted power users, and some legitimate enterprise devices will fail checks. Blocking them outright is a business decision, not a technical default.
- **It's rate-limited and requires network**, so it can't gate every request.
- **Never make it the only control.** Server-side validation of business rules still has to exist.

The standard design is a graduated response: full access for strong verdicts, extra friction (step-up auth, limits) for weak ones, and outright blocking only for the highest-risk operations.

## 6. What is Intent Hijacking, and how do you secure `android:exported` components?
Intent hijacking occurs when a malicious app intercepts an implicit intent meant for your app, or when a malicious app launches an unprotected component in your app to steal data or bypass login.
To prevent this, you should set `android:exported="false"` in your Manifest for any Activity, Service, or Receiver that does not need to be launched by external apps, forcing them to remain completely private to your app.

**Two distinct attacks live under this name**, and separating them makes the answer much stronger:

**1. Interception (data going out).** You send an implicit intent carrying sensitive data; a malicious app registers a matching intent filter and receives it. The user may not even see a chooser if the malicious app is the only match. The fix is to **never put sensitive data in an implicit intent** — use an explicit intent, or `setPackage()` to constrain the recipient.

**2. Unauthorised invocation (attack coming in).** A malicious app starts one of your exported components directly — jumping past your login screen into an authenticated activity, or triggering a service that performs a privileged action. The fix is `exported="false"`, or a permission gate.

```xml
<!-- Private: only your app can start it -->
<activity android:name=".PaymentActivity" android:exported="false" />

<!-- Must be exported (it has a filter) → defend it -->
<activity android:name=".ShareActivity" android:exported="true"
          android:permission="com.example.permission.SHARE">
    <intent-filter>
        <action android:name="android.intent.action.SEND" />
        <category android:name="android.intent.category.DEFAULT" />
        <data android:mimeType="text/plain" />
    </intent-filter>
</activity>
```

**Android 12 made `android:exported` mandatory** for any component with an intent filter — the app won't install without it. This was precisely because the implicit default (exported if it has a filter) surprised developers into exposing components they thought were private.

**Validate everything an exported component receives.** An exported component is an untrusted input boundary, like a web endpoint:

```kotlin
// Treat extras as hostile input
val id = intent.getStringExtra("id")?.takeIf { it.matches(SAFE_ID) } ?: return finish()
if (!sessionManager.isLoggedIn) { redirectToLogin(); return }
```

**Other hardening in the same family:**

- **`setPackage()` or an explicit component** when sending to a known app.
- **`Intent.createChooser()`** when the user should pick, so a single malicious match can't silently win.
- **`FLAG_GRANT_READ_URI_PERMISSION`** with a `FileProvider` rather than broad file access.
- **`LocalBroadcastManager` is deprecated** — for in-app events, use a `SharedFlow` instead of a broadcast that could leak.
- **`PendingIntent` must be `FLAG_IMMUTABLE`** unless you specifically need mutability, or the receiver can rewrite the intent and act as you.

## 7. How do you secure sensitive web interactions inside `WebView`?
`WebView`s are frequent targets for attacks (like Cross-Site Scripting). Best practices include:
- Disabling JavaScript (`setJavaScriptEnabled(false)`) if you only need to display static HTML.
- Disabling file access (`setAllowFileAccess(false)`) to prevent attackers from reading local app files via file URIs.
- Using `WebMessage` ports instead of `addJavascriptInterface` for safer communication between Android and JS.

**Why `WebView` is uniquely risky:** it runs code you don't control **inside your app's sandbox**, with your app's UID. A compromised page is far more dangerous than a compromised browser tab, because it sits inside your security boundary rather than outside it.

**`addJavascriptInterface` is the historically catastrophic one.** Before API 17, *any* JavaScript could reach *every* public method of the bound object — including, via reflection, `Runtime.exec()`, giving arbitrary code execution. Since API 17 only `@JavascriptInterface`-annotated methods are exposed, which fixes the worst case but not the design problem: whatever you expose, a compromised or injected page can call.

```kotlin
// If you must use it, expose the absolute minimum and validate everything
class Bridge {
    @JavascriptInterface
    fun onResult(token: String) {
        if (!token.matches(TOKEN_PATTERN)) return      // treat as hostile input
        handle(token)
    }
}
```

**The hardening checklist:**

```kotlin
webView.settings.apply {
    javaScriptEnabled = false            // only enable if genuinely required
    allowFileAccess = false              // block file:// reads of your app data
    allowContentAccess = false
    allowFileAccessFromFileURLs = false
    allowUniversalAccessFromFileURLs = false   // critical — bypasses same-origin
    setGeolocationEnabled(false)
    domStorageEnabled = false            // unless needed
    setSupportMultipleWindows(false)
}
```

**Control navigation**, so a redirect can't take your WebView somewhere arbitrary:

```kotlin
webView.webViewClient = object : WebViewClient() {
    override fun shouldOverrideUrlLoading(v: WebView, r: WebResourceRequest): Boolean {
        return r.url.host !in ALLOWED_HOSTS     // block anything off-allowlist
    }
    override fun onReceivedSslError(v: WebView, h: SslErrorHandler, e: SslError) {
        h.cancel()      // NEVER h.proceed() — that disables TLS validation entirely
    }
}
```

`onReceivedSslError` calling `proceed()` is a recurring real-world vulnerability — it's the WebView equivalent of trusting all certificates, and Play now actively rejects apps that do it.

**Modern alternatives worth recommending:** use **Custom Tabs** for showing external web content (it runs in the browser's own sandbox with the user's cookies and security context, not yours), and `WebViewAssetLoader` to serve local assets over `https://` rather than `file://`. Keep **WebView updated** via Play — it's a Mainline module, so most devices get fixes independently of OS updates, but very old devices do not.

## 8. What is APK signature scheme v2/v3/v4?
Android requires all APKs to be cryptographically signed before installation.
- **v1**: Signed the contents of the ZIP file. Vulnerable to certain zip manipulation attacks and slow to verify.
- **v2**: Introduced a Signature Block inserted directly into the APK binary before the central directory. Verification is extremely fast, and any alteration to the APK bytes invalidates the signature.
- **v3/v4**: Added support for Key Rotation (changing your signing key without losing updates) and streaming installations.

**What signing is for**, since it's often misunderstood: it does **not** prove who you are to the user — the certificate is self-signed and nobody validates its identity. It proves **continuity of authorship**: that the update came from whoever published the original. That's why Android refuses an update signed with a different key, and why losing your key used to mean you could never update your app again.

**The schemes in detail:**

- **v1 (JAR signing)** — signs individual files inside the ZIP via `META-INF`. Its weaknesses: metadata outside the entries isn't covered (enabling the **Janus** and **Master Key** attack families), and verification requires decompressing and hashing every entry, making installs slow.
- **v2 (Android 7.0)** — signs the **whole APK as a byte stream**, with the signature in an APK Signing Block before the central directory. Any single changed byte invalidates it, and verification is a single pass over the file.
- **v3 (Android 9)** — adds **key rotation**: the block carries a proof-of-rotation chain so a new key can be shown to be authorised by the old one. You can finally change keys without losing your users.
- **v3.1 (Android 13)** — refines rotation targeting so you can rotate for newer platforms while older ones keep using the original key.
- **v4 (Android 11)** — produces a separate `.apk.idsig` file with a Merkle hash tree, enabling **incremental/streaming installation**: the app starts running before the full APK has transferred. Built for Play's instant-install experience and for fast ADB installs of large apps during development.

Schemes are **additive** — a modern APK is typically signed with v1+v2+v3 so older devices can still verify it.

```groovy
signingConfigs {
    release {
        storeFile file(System.getenv("KEYSTORE_PATH"))
        storePassword System.getenv("KEYSTORE_PASSWORD")   // never in git
        enableV1Signing false        // can disable if minSdk >= 24
        enableV2Signing true
        enableV3Signing true
    }
}
```

**In practice, Play App Signing changes the picture.** Google holds the real app signing key and you sign with an **upload key**, so a lost upload key is recoverable. Keep your keystore and passwords out of version control and in a secrets manager or CI secret store — a leaked signing key is one of the few genuinely unrecoverable mistakes in Android.

## 9. How do you store API keys securely (e.g., secrets Gradle plugin, Native C++ via NDK)?
Never hardcode API keys in Java/Kotlin or XML files, as they can easily be extracted via reverse engineering.
- **Better**: Use the `secrets-gradle-plugin` to read keys from a `local.properties` file that is ignored by Git, preventing leaks to public repositories.
- **Best (Obfuscation)**: Store highly sensitive keys in native C/C++ code using the Android NDK. Reverse engineering compiled C binaries is significantly harder than decompiling Java bytecode.

**The honest framing, which matters more than any technique here: there is no way to securely store a secret in a client app.** The app must be able to read the key to use it, so anyone with the APK and a debugger can too. Every method on this list — Gradle properties, NDK, obfuscation, encryption — raises the *effort* required. None of them changes the outcome against a motivated attacker. `strings` on a `.so`, or a breakpoint on the JNI boundary, defeats the NDK approach in minutes.

So the techniques split into two genuinely different problems:

**Problem 1: don't leak keys into version control.** This is real, solvable, and what the Gradle plugin addresses:

```properties
# local.properties — gitignored
MAPS_API_KEY=AIza...
```

```groovy
plugins { id 'com.google.android.libraries.mapsplatform.secrets-gradle-plugin' }
```

```xml
<meta-data android:name="com.google.android.geo.API_KEY"
           android:value="${MAPS_API_KEY}" />
```

In CI, inject the same values from the platform's secret store as environment variables. This stops the most common real incident by far: a key committed to a public repo and scraped by bots within minutes.

**Problem 2: an attacker extracts the key from the shipped APK.** The only genuine answers are architectural:

- **Keep the secret on your server.** The app calls *your* backend, which holds the third-party key and makes the upstream call. The key never ships.
- **Use keys that are safe to expose**, restricted by package name and signing certificate. Google Maps and Firebase keys are designed for this — they're public by nature, and security comes from the restrictions, not from hiding them.
- **Use short-lived, per-user tokens** obtained after authentication, rather than a long-lived shared secret.
- **Add Play Integrity** (question 5) so your backend can require that requests come from a genuine, unmodified app.

**So the ranking to state in an interview:** keep it server-side (best), use a restricted public key (fine), use short-lived tokens (fine), and only then — for keys that are low-value but shouldn't be casually scraped — use Gradle properties plus NDK obfuscation. Presenting NDK storage as "best" is the answer an interviewer will push back on.

## 10. What is Dynamic Feature Delivery, and how does on-demand module download work?
Built on top of the App Bundle (AAB), Dynamic Feature Delivery allows you to split large features (like a heavy camera filter pack or a customer support chat SDK) into separate modules. These modules are not installed when the user first downloads the app. Instead, your app uses the Play Core Library to request and download the module on demand only when the user specifically navigates to that feature.

**Why it exists:** install size directly affects conversion. Users on limited storage or slow connections abandon large downloads, and the effect is measurable. If 10% of your APK is a feature 5% of users touch, everyone pays for it.

**The delivery modes**, declared in the module's manifest:

- **`install-time`** (default) — included in the initial install, but can be uninstalled later (`removable`).
- **`on-demand`** — downloaded when your app requests it.
- **`conditional`** — installed at install time only if device conditions match (minimum SDK, country, device features like AR support).
- **Instant** — delivered via Google Play Instant without installation at all.

```xml
<dist:module dist:instant="false" dist:title="@string/filters_title">
    <dist:delivery><dist:on-demand /></dist:delivery>
    <dist:fusing dist:include="true" />
</dist:module>
```

**Requesting a module** goes through `SplitInstallManager`, and you must handle its full state machine — this is the part people underestimate:

```kotlin
val request = SplitInstallRequest.newBuilder().addModule("filters").build()
splitInstallManager.registerListener { state ->
    when (state.status()) {
        SplitInstallSessionStatus.DOWNLOADING ->
            showProgress(state.bytesDownloaded(), state.totalBytesToDownload())
        SplitInstallSessionStatus.REQUIRES_USER_CONFIRMATION ->
            splitInstallManager.startConfirmationDialogForResult(state, this, CODE)
        SplitInstallSessionStatus.INSTALLED -> launchFeature()
        SplitInstallSessionStatus.FAILED -> showError()
    }
}
splitInstallManager.startInstall(request)
```

`REQUIRES_USER_CONFIRMATION` fires for large downloads over mobile data and is easy to forget, leaving the install silently stuck.

**The real costs**, which an interviewer will want you to name:

- **The feature must work offline-absent.** Every entry point needs a "not installed yet" path, which complicates navigation.
- **Testing is harder** — you must test via `bundletool` or internal app sharing, because a debug build has everything installed.
- **Reflection or Navigation indirection** is needed to reach code that may not exist at compile time from the base module.
- **`SplitCompat`** must be installed for resources to resolve without an app restart.
- **Download can fail** — no network, no storage, user declines.

**When it's worth it:** genuinely large, genuinely optional features — an AR mode, a video editor, a language-specific OCR pack. **When it isn't:** shaving a few hundred KB, which buys complexity for no measurable benefit. The usual first step should be checking whether R8, resource shrinking, and WebP/vector assets already solve the size problem.

## 11. What is biometrics authentication and how is it implemented?
Biometrics allow users to authenticate using their fingerprint or face instead of a password. In Android, you implement this using the `androidx.biometric.BiometricPrompt` API. You construct a prompt, configure the allowed authenticators (e.g., Strong Biometric or Device Credential), and provide an authentication callback to handle the success or failure event.

**Use the AndroidX `BiometricPrompt`**, not the framework one and certainly not the deprecated `FingerprintManager`. The AndroidX version provides a consistent UI across versions, handles face/iris/fingerprint uniformly, and falls back to device credential.

```kotlin
val prompt = BiometricPrompt(this, ContextCompat.getMainExecutor(this),
    object : BiometricPrompt.AuthenticationCallback() {
        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
            val cipher = result.cryptoObject?.cipher     // the key is now usable
            decryptAndProceed(cipher)
        }
        override fun onAuthenticationError(code: Int, msg: CharSequence) { /* cancelled, lockout */ }
        override fun onAuthenticationFailed() { /* wrong finger — prompt stays open */ }
    })

val info = BiometricPrompt.PromptInfo.Builder()
    .setTitle("Unlock")
    .setSubtitle("Use your fingerprint to access your account")
    .setAllowedAuthenticators(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)
    .build()

prompt.authenticate(info, BiometricPrompt.CryptoObject(cipher))
```

**Always check availability first**, or the prompt silently does nothing:

```kotlin
when (BiometricManager.from(context).canAuthenticate(BIOMETRIC_STRONG)) {
    BIOMETRIC_SUCCESS -> prompt.authenticate(info, crypto)
    BIOMETRIC_ERROR_NONE_ENROLLED -> promptUserToEnroll()
    BIOMETRIC_ERROR_NO_HARDWARE, BIOMETRIC_ERROR_HW_UNAVAILABLE -> fallbackToPassword()
}
```

**The authenticator classes matter for security decisions:**

- **`BIOMETRIC_STRONG` (Class 3)** — low spoof-acceptance rate; **the only class that can gate KeyStore keys**.
- **`BIOMETRIC_WEAK` (Class 2)** — convenience only; many face-unlock implementations. Cannot be used with `CryptoObject`.
- **`DEVICE_CREDENTIAL`** — PIN, pattern, or password.

**The single most important implementation point**, and the one that distinguishes a secure integration from a decorative one: **use a `CryptoObject`.** Without it, biometric success is just a boolean your code checks — and a patched APK flips that boolean. With it, authentication **unlocks a KeyStore key** that is required to decrypt the data. The attacker can bypass your check and still have nothing, because the data stays encrypted.

```kotlin
KeyGenParameterSpec.Builder(...)
    .setUserAuthenticationRequired(true)           // key unusable without auth
    .setInvalidatedByBiometricEnrollment(true)     // new fingerprint invalidates the key
    .build()
```

**UX obligations:** always provide a non-biometric fallback (not everyone has or can use biometrics), handle `ERROR_LOCKOUT` after repeated failures, and distinguish `onAuthenticationFailed` (wrong finger, prompt remains) from `onAuthenticationError` (terminal). And note that **enrolling a new fingerprint invalidates the key** by design — handle that by re-provisioning, not by crashing.

## 12. What are implicit intent vulnerabilities and how does Android 13 address them?
Historically, if you broadcast an implicit intent containing sensitive data, any app on the device could register an intent filter to intercept it and steal the data.
Android 13 introduced strict intent resolution. Explicit intents are still delivered normally, but implicit intents are only delivered to exported components whose intent filters exactly match the intent's action and data, reducing accidental data leaks.

**The vulnerability in concrete terms:** an implicit intent is addressed by *description*, not by *recipient*. You say "something that can handle `ACTION_VIEW` on this data," and the system finds matches. A malicious app can register a filter that matches, and if it's the only match, it receives your intent — including every extra — with no chooser and no indication to the user.

**Android 13's change precisely:** implicit intents can no longer be delivered to components that are **not exported**. Previously, a non-exported component with an intent filter could still receive an implicit intent from within the same app, which blurred the boundary and made the exported flag unreliable as a security statement. Now the rule is simple: *if it isn't exported, implicit intents don't reach it.*

**The broader hardening timeline** is worth giving, because it's a sequence of related fixes:

- **Android 11** — package visibility: you can't even see other apps without declaring `<queries>`, limiting reconnaissance.
- **Android 12** — `android:exported` becomes **mandatory** for components with intent filters, and `PendingIntent` mutability must be declared.
- **Android 13** — strict implicit-intent matching, and runtime receiver export flags (`RECEIVER_EXPORTED` / `RECEIVER_NOT_EXPORTED`).
- **Android 14** — intents must match the target's declared filters more strictly still; `BroadcastReceiver` export declaration enforced.

**What you should do regardless of platform version:**

```kotlin
// Never: sensitive data in an implicit intent
sendBroadcast(Intent("com.example.LOGIN").putExtra("token", token))

// Explicit — only your component can receive it
sendBroadcast(Intent(this, LoginReceiver::class.java).putExtra("token", token))

// Or constrain an implicit intent to a known package
intent.setPackage("com.known.app")

// Or don't use intents at all for in-app events
viewModel.events.emit(LoginSucceeded(token))     // SharedFlow — no IPC, no exposure
```

**And on the receiving side**, treat every exported component as an untrusted input boundary: validate extras, verify the caller where it matters (`getCallingPackage()`, or a signature permission), and never assume an intent came from your own app.

## 13. How do you protect against screen recording or screenshots of sensitive data?
To prevent users or malicious background apps from taking screenshots or recording sensitive screens (like passwords or banking info), you must set a secure flag on the Activity's window during `onCreate`:
`window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)`
The system will render the screen completely black in any screenshots or screen recordings.

**What `FLAG_SECURE` actually does:** it marks the window's `Surface` as secure, so the compositor excludes it from screen capture, screen recording, and casting to non-secure displays. It also keeps the screen out of the **Recents/overview thumbnail**, which is an often-forgotten leak — the app switcher preview of a banking screen is visible to anyone who picks up the phone.

**Set it before `setContentView`:**

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    window.setFlags(
        WindowManager.LayoutParams.FLAG_SECURE,
        WindowManager.LayoutParams.FLAG_SECURE
    )
    setContentView(R.layout.activity_payment)
}
```

**Per-screen, not global.** The flag is a property of the **window**, so in a single-Activity app it applies to everything — including screens where blocking screenshots just annoys users. Set and clear it as you navigate:

```kotlin
// In a Fragment
override fun onResume() {
    super.onResume()
    requireActivity().window.setFlags(FLAG_SECURE, FLAG_SECURE)
}
override fun onPause() {
    super.onPause()
    requireActivity().window.clearFlags(FLAG_SECURE)
}
```

**Dialogs and separate windows need it separately**, since each is its own window:

```kotlin
dialog.window?.setFlags(FLAG_SECURE, FLAG_SECURE)
```

**Its limits are substantial**, and naming them is what makes this a good answer rather than a recited line:

- **It does not stop a photograph of the screen** with another device, which is the easiest attack of all.
- **Rooted devices** can bypass it.
- **Accessibility services** can still read the view content — they operate on the semantic tree, not the pixels.
- It can **break legitimate use**: screen sharing in a support call, casting, or a user's own screenshot for their records.

**So treat it as privacy hygiene, not a security control.** It protects against the realistic threats — an accidental screenshot in a shared chat, a screen-recording app running in the background, an exposed Recents thumbnail — and it is the right default on payment, credential, and personal-data screens. It is not a substitute for not displaying more sensitive data than necessary in the first place (mask card numbers, don't show full credentials).

Android 14 adds `ScreenCaptureCallback`, which lets you *detect* a screenshot and respond (log it, warn the user) rather than only blocking it.

## 14. What is the purpose of `networkSecurityConfig`?
It is an XML file referenced in the Android Manifest (`android:networkSecurityConfig`) that allows you to customize your app's network security settings without modifying app code. 
You can use it to:
- Enforce strict HTTPS-only traffic (cleartext traffic permitted = false).
- Trust custom Certificate Authorities (CAs) for debugging environments.
- Easily implement Certificate Pinning.

**The core value is that it's declarative and code-free.** Before it existed, trusting a custom CA or pinning a certificate meant writing a `TrustManager` — and the overwhelmingly common outcome was developers pasting a "trust all certificates" `TrustManager` from Stack Overflow to make a staging environment work, then shipping it. That single pattern was responsible for a large share of Android TLS vulnerabilities. A config file that can be scoped to debug builds removes the temptation.

```xml
<!-- res/xml/network_security_config.xml -->
<network-security-config>
    <!-- Production default: HTTPS only -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors><certificates src="system" /></trust-anchors>
    </base-config>

    <!-- Pin a specific domain -->
    <domain-config>
        <domain includeSubdomains="true">api.example.com</domain>
        <pin-set expiration="2027-01-01">
            <pin digest="SHA-256">base64primary==</pin>
            <pin digest="SHA-256">base64backup==</pin>   <!-- backup is mandatory -->
        </pin-set>
    </domain-config>

    <!-- Debug-only: trust the local proxy CA. Never applies to release. -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system" />
            <certificates src="@raw/debug_ca" />
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

```xml
<application android:networkSecurityConfig="@xml/network_security_config" />
```

**`<debug-overrides>` is the key feature** — it applies **only** when `android:debuggable="true"`, so a debug CA cannot leak into production. This is what makes Charles/mitmproxy debugging safe.

**On certificate pinning**, the nuances that matter:

- **Always include a backup pin.** If your only pinned certificate is rotated or revoked, every installed copy of your app loses connectivity until users update — an outage you cannot fix server-side. This has happened to major apps.
- **Set an `expiration`.** After that date pinning stops being enforced rather than bricking the app, which is a deliberate safety valve.
- **Pin the intermediate or the public key**, not the leaf, to survive routine certificate renewal.
- Pinning raises the bar against a compromised or user-installed CA; it is not needed for most apps.

**Also note the platform default shifted:** since Android 9 (API 28), **cleartext HTTP is blocked by default**, so `android:usesCleartextTraffic="true"` or a config entry is required to allow it — and allowing it broadly is a Play policy and security concern.

## 15. What is the Google Play Console pre-launch report?
When you upload an APK/AAB to a testing track, Google Play automatically installs it on a wide variety of physical devices in the Firebase Test Lab. It crawls your app for a few minutes and generates a pre-launch report detailing crashes, UI layout issues on specific screen sizes, accessibility warnings, and potential security vulnerabilities, allowing you to fix them before pushing to production.

**What it checks**, in more detail:

- **Stability** — crashes and ANRs encountered during the automated crawl, with stack traces and the device they occurred on.
- **Performance** — startup time, and rendering metrics per device.
- **Accessibility** — touch targets below the minimum size, insufficient contrast, missing content descriptions.
- **Screenshots** — of every screen the crawler reached, on each device, which is a quick way to spot layout breakage on unusual aspect ratios or densities.
- **Security** — findings from Google Play's App Security Improvement scanners (known-vulnerable library versions, insecure TLS handling, exposed components).

**Its biggest limitation is crawl depth.** The robot taps around semi-randomly and gets stuck at **login screens** almost immediately — so by default it tests your sign-in screen and nothing else. Two features fix this:

- **Provide test credentials** in the pre-launch report settings, so the crawler can log in.
- **Write a Robo script** — record a journey in Android Studio and upload it, so the crawler follows a deliberate path through your app instead of guessing.

Without one of these, the report's value is close to zero for any app behind authentication, and candidates who mention this are clearly speaking from experience.

**Where it fits in a release process**, which is the more interesting answer:

1. **Unit and instrumentation tests** in CI — fast, deterministic, run on every commit.
2. **Macrobenchmark** — catches startup and jank regressions before release.
3. **Pre-launch report** — broad device coverage you can't economically maintain yourself, catching OEM- and density-specific breakage.
4. **Internal/closed testing tracks** — real users, real usage patterns.
5. **Staged rollout** — 1% → 5% → 20% → 100%, watching **Android vitals** (crash rate, ANR rate) and **Crashlytics** at each step, with the ability to halt.

The pre-launch report is **complementary, not a substitute** for testing: it's wide but shallow. Your own tests are narrow but deep. And the staged rollout is the real safety net, because it's the only stage where you see genuine user behaviour with the ability to stop.
