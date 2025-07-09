import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './app/views/Home.js';

const Stack = createNativeStackNavigator();

const App = () => {
    return (
      <NavigationContainer>
        <Stack.Navigator> 
          <Stack.Screen 
            name='Home' 
            component={HomeScreen} 
            options={{title: 'Fall Down dectection app'}}
          />
        </Stack.Navigator>    
      </NavigationContainer>    
    );  
  };

export default App;
