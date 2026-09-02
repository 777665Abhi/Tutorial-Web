---
title: "Security & App Publishing"
description: "Best practices for securing Android apps and navigating the Play Store release process."
---

## 91. How do R8 and ProGuard work for code shrinking, obfuscation, and optimization?
R8 (the modern default) and ProGuard are compilers used during the release build process.
- **Shrinking**: They analyze the code graph and remove any unused classes, methods, or resources, dramatically reducing the APK size.
- **Obfuscation**: They rename the remaining classes and variables to short, meaningless names (e.g., `class MainActivity` becomes `class a`), making it incredibly difficult for attackers to reverse-engineer your APK.
- **Optimization**: They rewrite code to be more efficient (e.g., removing dead `if` branches or inlining functions).

## 92. What is an Android App Bundle (AAB), and how does it differ from a standard APK?
An APK (Android Package) contains all compiled code and resources for *every* device configuration (all languages, all screen densities, all CPU architectures).
An AAB is a publishing format uploaded to the Google Play Store. Google Play uses the AAB to generate and serve optimized, device-specific APKs. When a user downloads the app, they only download the resources explicitly needed for their specific device (e.g., only English strings and xhdpi graphics), saving massive amounts of user bandwidth and storage.

## 93. What is the Android KeyStore system, and how do you securely store cryptographic keys?
The Android KeyStore protects cryptographic keys by storing them in a secure hardware container (Trusted Execution Environment) separate from the main Android OS. Once a key is generated inside the KeyStore, its raw key material can *never* be extracted or read by your app (or attackers). Your app simply asks the KeyStore to perform encryption/decryption operations using the secure key.

## 94. How do runtime permissions work, and what are dangerous permissions?
Android categorizes permissions based on privacy risk.
- **Normal Permissions** (e.g., Internet): Granted automatically at install time.
- **Dangerous Permissions** (e.g., Location, Camera, Contacts): Require explicit user consent at runtime. You must call `requestPermissions()`, explain why you need it, and gracefully handle cases where the user denies the request.

## 95. What is Play Integrity API (formerly SafetyNet), and why is it used?
The Play Integrity API is an anti-abuse system. Your app requests an integrity token, which you send to your backend. Your backend verifies the token with Google's servers. 
It confirms three things:
1. The app binary is genuine and unmodified (not a tampered/cracked APK).
2. The Android OS is genuine and not rooted or compromised.
3. The app was installed from Google Play.

## 96. What is Intent Hijacking, and how do you secure `android:exported` components?
Intent hijacking occurs when a malicious app intercepts an implicit intent meant for your app, or when a malicious app launches an unprotected component in your app to steal data or bypass login.
To prevent this, you should set `android:exported="false"` in your Manifest for any Activity, Service, or Receiver that does not need to be launched by external apps, forcing them to remain completely private to your app.

## 97. How do you secure sensitive web interactions inside `WebView`?
`WebView`s are frequent targets for attacks (like Cross-Site Scripting). Best practices include:
- Disabling JavaScript (`setJavaScriptEnabled(false)`) if you only need to display static HTML.
- Disabling file access (`setAllowFileAccess(false)`) to prevent attackers from reading local app files via file URIs.
- Using `WebMessage` ports instead of `addJavascriptInterface` for safer communication between Android and JS.

## 98. What is APK signature scheme v2/v3/v4?
Android requires all APKs to be cryptographically signed before installation.
- **v1**: Signed the contents of the ZIP file. Vulnerable to certain zip manipulation attacks and slow to verify.
- **v2**: Introduced a Signature Block inserted directly into the APK binary before the central directory. Verification is extremely fast, and any alteration to the APK bytes invalidates the signature.
- **v3/v4**: Added support for Key Rotation (changing your signing key without losing updates) and streaming installations.

## 99. How do you store API keys securely (e.g., secrets Gradle plugin, Native C++ via NDK)?
Never hardcode API keys in Java/Kotlin or XML files, as they can easily be extracted via reverse engineering.
- **Better**: Use the `secrets-gradle-plugin` to read keys from a `local.properties` file that is ignored by Git, preventing leaks to public repositories.
- **Best (Obfuscation)**: Store highly sensitive keys in native C/C++ code using the Android NDK. Reverse engineering compiled C binaries is significantly harder than decompiling Java bytecode.

## 100. What is Dynamic Feature Delivery, and how does on-demand module download work?
Built on top of the App Bundle (AAB), Dynamic Feature Delivery allows you to split large features (like a heavy camera filter pack or a customer support chat SDK) into separate modules. These modules are not installed when the user first downloads the app. Instead, your app uses the Play Core Library to request and download the module on demand only when the user specifically navigates to that feature.

## 101. What is biometrics authentication and how is it implemented?
Biometrics allow users to authenticate using their fingerprint or face instead of a password. In Android, you implement this using the `androidx.biometric.BiometricPrompt` API. You construct a prompt, configure the allowed authenticators (e.g., Strong Biometric or Device Credential), and provide an authentication callback to handle the success or failure event.

## 102. What are implicit intent vulnerabilities and how does Android 13 address them?
Historically, if you broadcast an implicit intent containing sensitive data, any app on the device could register an intent filter to intercept it and steal the data.
Android 13 introduced strict intent resolution. Explicit intents are still delivered normally, but implicit intents are only delivered to exported components whose intent filters exactly match the intent's action and data, reducing accidental data leaks.

## 103. How do you protect against screen recording or screenshots of sensitive data?
To prevent users or malicious background apps from taking screenshots or recording sensitive screens (like passwords or banking info), you must set a secure flag on the Activity's window during `onCreate`:
`window.setFlags(WindowManager.LayoutParams.FLAG_SECURE, WindowManager.LayoutParams.FLAG_SECURE)`
The system will render the screen completely black in any screenshots or screen recordings.

## 104. What is the purpose of `networkSecurityConfig`?
It is an XML file referenced in the Android Manifest (`android:networkSecurityConfig`) that allows you to customize your app's network security settings without modifying app code. 
You can use it to:
- Enforce strict HTTPS-only traffic (cleartext traffic permitted = false).
- Trust custom Certificate Authorities (CAs) for debugging environments.
- Easily implement Certificate Pinning.

## 105. What is the Google Play Console pre-launch report?
When you upload an APK/AAB to a testing track, Google Play automatically installs it on a wide variety of physical devices in the Firebase Test Lab. It crawls your app for a few minutes and generates a pre-launch report detailing crashes, UI layout issues on specific screen sizes, accessibility warnings, and potential security vulnerabilities, allowing you to fix them before pushing to production.
