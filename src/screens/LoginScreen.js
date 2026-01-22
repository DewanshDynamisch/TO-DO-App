import React, { Component } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class LoginScreen extends Component {
  state = {
    username: '',
    password: '',
    showPassword: false, 
  };

  /* VALIDATION */

  validateInput = () => {
    const { username, password } = this.state;

    if (!username.trim()) {
      Alert.alert('Validation Error', 'Username is required');
      return false;
    }

    if (username.length < 3) {
      Alert.alert(
        'Validation Error',
        'Username must be at least 3 characters'
      );
      return false;
    }

    if (!password) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }

    if (password.length < 6) {
      Alert.alert(
        'Validation Error',
        'Password must be at least 6 characters'
      );
      return false;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      Alert.alert(
        'Validation Error',
        'Password must contain:\n• 1 uppercase\n• 1 lowercase\n• 1 number'
      );
      return false;
    }

    return true;
  };

  /*  LOGIN */

  handleLogin = async () => {
    if (!this.validateInput()) return;

    const { username } = this.state;

    const userData = {
      userId: username.trim().toLowerCase(),
      username: username.trim(),
    };

    await AsyncStorage.setItem(
      'USER_DATA',
      JSON.stringify(userData)
    );

    this.props.onLoginSuccess(userData);
  };

  /*  UI */

  render() {
    const { username, password, showPassword } = this.state;

    return (
      <View style={styles.container}>
        <Text style={styles.appName}>ToDo App</Text>
        <Text style={styles.title}>Welcome</Text>

        {/* USERNAME */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            placeholder="Enter username"
            placeholderTextColor="#9CA3AF"
            value={username}
            onChangeText={text => this.setState({ username: text })}
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        {/* PASSWORD */}
        <View style={styles.inputBox}>
          <Text style={styles.label}>Password</Text>

          <View style={styles.passwordWrapper}>
            <TextInput
              placeholder="Enter password"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={text =>
                this.setState({ password: text })
              }
              secureTextEntry={!showPassword}
              style={styles.passwordInput}
            />

            {/* 👁 Toggle Button */}
            <TouchableOpacity
              onPress={() =>
                this.setState({ showPassword: !showPassword })
              }
            >
              <Text style={styles.eye}>
                {showPassword ? '🙈' : '👁️'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* LOGIN BUTTON */}
        <TouchableOpacity
          style={styles.button}
          onPress={this.handleLogin}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          Password must contain uppercase, lowercase & number
        </Text>
      </View>
    );
  }
}

export default LoginScreen;

/* STYLES  */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F9FAFB',
  },

  appName: {
    fontSize: 25,
    fontWeight: '800',
    textAlign: 'center',
    color: '#6366F1',
    marginBottom: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 30,
    color: '#111827',
  },

  inputBox: {
    marginBottom: 18,
  },

  label: {
    marginBottom: 6,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
  },

  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
  },

  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
  },

  eye: {
    fontSize: 18,
    paddingHorizontal: 8,
  },

  button: {
    backgroundColor: '#6366F1',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },

  buttonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 16,
  },

  hint: {
    marginTop: 15,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
  },
});
