// src/components/Register.jsx
import { useState } from 'react';
import './styles/Auth.css';
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function Register({ onRegister, onSwitchToLogin }) {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            const errorMsg = 'Passwords do not match';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        setIsLoading(true);

        try {
            console.log('Attempting to connect to:', import.meta.env.VITE_BACKEND_URL);
            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, username, password }),
            });

            const data = await response.json();
            console.log('Server response:', data);

            if (response.ok) {
                toast.success('Registration successful! Please login.');
                navigate('/login');
            } else {
                const errorMessage = data.error || data.message || 'Registration failed';
                toast.error(errorMessage);
                setError(errorMessage);
            }
        } catch (error) {
            console.error('Registration error:', error);
            let errorMessage = 'An error occurred during registration.';
            
            if (error.message === 'Failed to fetch') {
                errorMessage = 'Unable to connect to the server. Please check your internet connection or try again later.';
            }
            
            toast.error(errorMessage);
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <form onSubmit={handleSubmit} className="auth-form">
                <h2>Create Account 🚀</h2>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="Enter your email"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Choose a username"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Create a password"
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Confirm Password</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm your password"
                    />
                </div>
                <button 
                    type="submit" 
                    className="auth-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Creating Account...' : 'Register'}
                </button>
                <div className="auth-switch">
                    Already have an account?{' '}
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        onSwitchToLogin();
                    }}>Login</a>
                </div>
            </form>
            <ToastContainer />
        </div>
    );
}

export default Register;