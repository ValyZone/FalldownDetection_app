import { StyleSheet, View } from 'react-native';
import DetectionHome from '../components/DetectionHome'

const HomeScreen = () => {
    return (
        <View style={styles.container}>
            <DetectionHome />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    }
})

export default HomeScreen;