@echo off
REM One-click launcher for AmazingWallet on a USB-connected Android phone.
REM Sets up adb (downloaded to %USERPROFILE%\platform-tools) and starts Expo
REM in Expo Go mode with a cleared cache. After it starts, press the "a" key
REM to open the app on your plugged-in phone.
set "ANDROID_HOME=%USERPROFILE%"
set "PATH=%PATH%;%USERPROFILE%\platform-tools"
echo Starting Expo (Go mode, cache cleared)...
echo After it loads, press the "a" key to open on your USB-connected phone.
npx expo start --go -c
