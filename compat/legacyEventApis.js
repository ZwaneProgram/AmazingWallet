// Compatibility shim: native-base 3.x ↔ modern React Native (0.76+).
//
// native-base still calls the OLD event API `X.removeEventListener(type, handler)`
// on AppState, BackHandler, and Dimensions. React Native removed those methods —
// `addEventListener` now returns a subscription you call `.remove()` on. Calling
// the missing `removeEventListener` throws:
//   "_reactNative.<X>.removeEventListener is not a function (it is undefined)"
//
// This restores `removeEventListener` on those objects by remembering the
// subscription returned from `addEventListener` (keyed by handler) and calling
// `.remove()` on it. Import this FIRST in index.js, before any native-base code.
import { AppState, BackHandler, Dimensions } from "react-native";

function restoreRemoveEventListener(target, name) {
  if (!target || typeof target.addEventListener !== "function") return;
  if (typeof target.removeEventListener === "function") return; // already supported

  const subscriptions = new Map(); // handler -> subscription[]
  const originalAdd = target.addEventListener.bind(target);

  target.addEventListener = (...args) => {
    const subscription = originalAdd(...args);
    const handler = args[args.length - 1];
    if (typeof handler === "function" && subscription) {
      const list = subscriptions.get(handler) || [];
      list.push(subscription);
      subscriptions.set(handler, list);
    }
    return subscription;
  };

  target.removeEventListener = (...args) => {
    const handler = args[args.length - 1];
    const list = subscriptions.get(handler);
    if (list) {
      list.forEach((s) => s && typeof s.remove === "function" && s.remove());
      subscriptions.delete(handler);
    }
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[compat] restored ${name}.removeEventListener`);
  }
}

restoreRemoveEventListener(AppState, "AppState");
restoreRemoveEventListener(BackHandler, "BackHandler");
restoreRemoveEventListener(Dimensions, "Dimensions");
