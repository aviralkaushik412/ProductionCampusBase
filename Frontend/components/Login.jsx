// src/components/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './styles/Auth.css';

const Login = ({ onLogin, onSwitchToRegister }) => {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await fetch('https://campuscubee.onrender.com/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include',
                mode: 'cors'
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Login successful!');
                navigate('/dashboard');
            } else {
                const errorMessage = data.message || 'Login failed';
                toast.error(errorMessage);
                setError(errorMessage);
            }
        } catch (error) {
            console.error('Login error:', error);
            let errorMessage = 'An error occurred during login.';
            
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
                <h2>Welcome Back 👋</h2>
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
                    <label htmlFor="password">Password</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter your password"
                    />
                </div>
                <button 
                    type="submit" 
                    className="auth-button"
                    disabled={isLoading}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
                <div className="auth-switch">
                    Don't have an account?{' '}
                    <a href="#" onClick={onSwitchToRegister}>Register</a>
                </div>
            </form>
        </div>
    );
}

export default Login;