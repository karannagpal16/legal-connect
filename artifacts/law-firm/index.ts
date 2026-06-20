import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { registerRootComponent } from 'expo';
// Pointing directly inside the 'src' directory where the files live
import App from './src/index.native'; 

registerRootComponent(App);