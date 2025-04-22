import { useEffect, useState } from 'react';
import './styles/ThemeSelector.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

function ThemeSelector({ onClose, onSelectTheme }) {
    const [themes, setThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchThemes = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/themes`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to load themes');
                }

                const data = await response.json();
                setThemes(data.themes);
                setLoading(false);
            } catch (err) {
                console.error('Error loading themes:', err);
                setError('Failed to load themes. Please try again.');
                setLoading(false);
            }
        };

        fetchThemes();
    }, []);

    const handleOverlayClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="theme-selector-overlay" onClick={handleOverlayClick}>
            <div className="theme-selector-content">
                <div className="theme-selector-header">
                    <h2>Chat Background</h2>
                    <button 
                        className="close-button" 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        &times;
                    </button>
                </div>
                
                {loading ? (
                    <div className="theme-loading">Loading themes...</div>
                ) : error ? (
                    <div className="theme-error">
                        {error}
                        <button 
                            className="retry-button"
                            onClick={() => {
                                setLoading(true);
                                setError(null);
                                fetchThemes();
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : themes.length === 0 ? (
                    <div className="theme-empty">
                        No background themes available.
                    </div>
                ) : (
                    <div className="theme-grid">
                        {themes.map((theme, index) => (
                            <div 
                                key={index} 
                                className="theme-item"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTheme(theme.path);
                                }}
                            >
                                <img 
                                    src={`${BACKEND_URL}/${theme.thumbnail}`} 
                                    alt={`Theme ${index + 1}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default ThemeSelector; 