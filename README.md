# Liftbook
A progressive overload tracker. Focused on simplicty and perfomance. Free for use and ads!

## Features
- **No Ads & Offline-First** — A distraction-free experience that works entirely without an internet connection.
- **Progressive Overload Tracking** — Log weight training sets with precision, including weight, reps, and RIR (Reps in Reserve).
- **Bodyweight Management** — Monitor your physique with daily logs and automated weekly average calculations.
- **Media Attachments** — Attach photos and videos to your entries for form reviews and physical progress tracking.
- **Data Portability** — Take full control of your data with built-in CSV export and import functionality.

## How to run
Currently the app is not avaible on App Store or Play Store.
You will have to compile it and install.

### Android
```bash
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
adb install app/build/outputs/apk/app-release.apk
```
### iOS
- **Prerequisites:** macOS with Xcode installed and a valid Apple Developer signing setup (required for device/release installs).
- **Build & export .ipa (Release):**
```bash
npx expo prebuild --platform ios
cd ios
xcodebuild -workspace LiftBook.xcworkspace -scheme LiftBook -configuration Release archive -archivePath build/LiftBook.xcarchive
xcodebuild -exportArchive -archivePath build/LiftBook.xcarchive -exportOptionsPlist ExportOptions.plist -exportPath build
```
- **Notes:** `ExportOptions.plist` must specify your `method` (development/ad-hoc/app-store), `teamID`, and provisioning profile mappings.
- **Install to a connected device:**
	- GUI: Open Xcode → Window → Devices and Simulators → select device → click `+` or drag the `.ipa` into the Installed Apps list.
	- CLI (requires libimobiledevice / ideviceinstaller):
```bash
ideviceinstaller -i build/YourApp.ipa
```
- **Install to simulator (no signing):**
```bash
xcrun simctl install booted build/Build/Products/Release-iphonesimulator/LiftBook.app
xcrun simctl launch booted <your.bundle.identifier>
```

### Future features:
Online sync via login.
