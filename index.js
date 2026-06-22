// Must run before any native-base code loads — restores legacy RN event APIs
// (AppState/BackHandler/Dimensions.removeEventListener) that native-base still uses.
import './compat/legacyEventApis';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
