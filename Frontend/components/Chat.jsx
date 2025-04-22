// src/components/Chat.jsx
import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './styles/Chat.css';
import { FaEllipsisV, FaPaperclip, FaSmile, FaMicrophone, FaSearch, FaFilter, FaCheck, FaCheckDouble, FaArrowRight, FaExclamationTriangle, FaCog, FaCamera, FaPencilAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Settings from './Settings';
import ThemeSelector from './ThemeSelector';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';

let socket;

function Chat({ username, onLogout }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [activeUsers, setActiveUsers] = useState(1);
    const messagesEndRef = useRef(null);
    const [isTyping, setIsTyping] = useState(false);
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showGroupMenu, setShowGroupMenu] = useState(false);
    const [groupName, setGroupName] = useState('Group Chat');
    const [groupIcon, setGroupIcon] = useState('https://api.dicebear.com/7.x/initials/svg?seed=Group');
    const groupIconInputRef = useRef(null);
    const [showThemeSelector, setShowThemeSelector] = useState(false);
    const [currentTheme, setCurrentTheme] = useState(null);
    const [showMenu, setShowMenu] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        // Initialize socket connection
        socket = io(BACKEND_URL, {
            auth: { token: localStorage.getItem('token') }
        });

        // Socket event handlers
        socket.on('connect', () => {
            console.log('Connected to server');
            setIsConnected(true);
        });

        socket.on('connect_error', (err) => {
            console.error('Connection error:', err);
            if (err.message === 'Authentication error') {
                onLogout();
            }
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
            setIsConnected(false);
        });

        socket.on('load messages', (initialMessages) => {
            console.log('Received initial messages:', initialMessages);
            setMessages(initialMessages);
        });

        socket.on('chat message', (message) => {
            console.log('Received new message:', message);
            setMessages(prev => [...prev, message]);
        });

        socket.on('active users', (count) => {
            setActiveUsers(count);
        });

        socket.on('error', (error) => {
            console.error('Socket error:', error);
            if (error.message === 'Message contains inappropriate content') {
                setInput(''); // Clear the input if it contains bad words
                setShowWarning(true); // Show warning screen
                setTimeout(() => {
                    setShowWarning(false); // Hide warning after 4.5 seconds
                }, 4500);
            } else {
                toast.error(error.message || 'An error occurred');
            }
        });

        // Cleanup on unmount
        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('disconnect');
                socket.off('load messages');
                socket.off('chat message');
                socket.off('active users');
                socket.off('error');
                socket.disconnect();
            }
        };
    }, [onLogout]);

    // Scroll to bottom when messages update
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', true);
        }
    };

    const handleStopTyping = () => {
        setIsTyping(false);
        socket.emit('typing', false);
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Only allow images
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload only image files');
            return;
        }

        // Max size 5MB
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Please upload images smaller than 5MB');
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append('image', file);

            // Upload image to server
            const response = await fetch(`${BACKEND_URL}/api/upload`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            
            // Send message with image URL
            socket.emit('chat message', {
                type: 'image',
                url: `${BACKEND_URL}/${data.url}`,
                text: 'Sent an image'
            });

            toast.success('Image sent successfully');
        } catch (error) {
            console.error('Error uploading image:', error);
            toast.error('Failed to upload image. Please try again.');
        } finally {
            setIsUploading(false);
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim() && isConnected) {
            socket.emit('chat message', {
                type: 'text',
                text: input
            });
            setInput('');
            handleStopTyping();
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleGroupNameChange = async (newName) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/group/name`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: newName })
            });

            if (!response.ok) {
                throw new Error('Failed to update group name');
            }

            setGroupName(newName);
            socket.emit('group update', { type: 'name', name: newName });
            toast.success('Group name updated successfully');
        } catch (error) {
            console.error('Error updating group name:', error);
            toast.error('Failed to update group name');
        }
    };

    const handleGroupIconChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please upload only image files');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Please upload images smaller than 5MB');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('icon', file);

            const response = await fetch(`${BACKEND_URL}/api/group/icon`, {
                method: 'PUT',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update group icon');
            }

            const data = await response.json();
            const newIconUrl = `${BACKEND_URL}/${data.url}`;
            setGroupIcon(newIconUrl);
            socket.emit('group update', { type: 'icon', url: newIconUrl });
            toast.success('Group icon updated successfully');
        } catch (error) {
            console.error('Error updating group icon:', error);
            toast.error('Failed to update group icon');
        }
    };

    useEffect(() => {
        socket.on('group update', (update) => {
            if (update.type === 'name') {
                setGroupName(update.name);
            } else if (update.type === 'icon') {
                setGroupIcon(update.url);
            }
        });

        return () => {
            socket.off('group update');
        };
    }, []);

    useEffect(() => {
        // Fetch current theme from server
        fetch(`${BACKEND_URL}/api/themes/current`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(res => res.json())
            .then(data => {
                if (data.theme) {
                    setCurrentTheme(data.theme);
                }
            })
            .catch(err => console.error('Error fetching current theme:', err));

        socket.on('theme update', (theme) => {
            setCurrentTheme(theme);
        });

        return () => {
            socket.off('theme update');
        };
    }, []);

    const handleThemeSelect = async (themePath) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/themes/current`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ theme: themePath })
            });

            if (!response.ok) {
                throw new Error('Failed to update theme');
            }

            const data = await response.json();
            setCurrentTheme(themePath);
            socket.emit('theme update', themePath);
            setShowThemeSelector(false);
            toast.success('Chat background updated successfully');
        } catch (error) {
            console.error('Error updating theme:', error);
            toast.error('Failed to update chat background');
        }
    };

    // Add click outside handler for menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenu && !event.target.closest('.menu-container')) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    return (
        <div className="whatsapp-container">
            {showSettings && (
                <Settings 
                    onClose={() => setShowSettings(false)}
                    username={username}
                    role="Cargo"
                />
            )}
            {showWarning && (
                <div className="warning-overlay">
                    <div className="warning-content">
                        <FaExclamationTriangle className="warning-icon" />
                        <h2>Warning!</h2>
                        <p>Your message contains inappropriate content.</p>
                        <p>Please be mindful of the community guidelines.</p>
                    </div>
                </div>
            )}
            {showThemeSelector && (
                <ThemeSelector
                    onClose={() => setShowThemeSelector(false)}
                    onSelectTheme={(theme) => {
                        handleThemeSelect(theme);
                        setShowThemeSelector(false);
                    }}
                />
            )}
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <div className="user-avatar">
                        <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${username}`} alt="profile" />
                    </div>
                    <div className="header-icons">
                        <button className="icon-button"><FaFilter /></button>
                        <button onClick={onLogout}>Logout</button>
                    </div>
                </div>
                <div className="search-container">
                    <div className="search-wrapper">
                        <FaSearch className="search-icon" />
                        <input type="text" placeholder="Search or start new chat" />
                    </div>
                </div>
                <div className="chat-list">
                    <div className="chat-item active">
                        <div className="chat-item-avatar">
                            <img src="https://api.dicebear.com/7.x/initials/svg?seed=Group" alt="Group Chat" />
                        </div>
                        <div className="chat-item-info">
                            <div className="chat-item-header">
                                <div className="chat-item-name">Group Chat</div>
                                <div className="chat-item-time">12:00</div>
                            </div>
                            <div className="chat-item-last-message">
                                <span className="message-preview">Active users: {activeUsers}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="sidebar-footer">
                    <button className="settings-button" onClick={() => setShowSettings(true)}>
                        <FaCog />
                        <span>Settings</span>
                    </button>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="chat-area">
                <div className="chat-header">
                    <div className="chat-header-info">
                        <div className="chat-avatar" onClick={() => groupIconInputRef.current?.click()}>
                            <img src={groupIcon} alt="Group Chat" />
                            <div className="avatar-overlay">
                                <FaCamera />
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={groupIconInputRef}
                            onChange={handleGroupIconChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <div className="chat-details">
                            <div className="chat-name-container">
                                <span className="chat-name">{groupName}</span>
                                <button className="edit-name-button" onClick={() => {
                                    const newName = prompt('Enter new group name:', groupName);
                                    if (newName && newName.trim() !== '' && newName !== groupName) {
                                        handleGroupNameChange(newName.trim());
                                    }
                                }}>
                                    <FaPencilAlt />
                                </button>
                            </div>
                            <div className="chat-status">{activeUsers} participants • {isConnected ? 'online' : 'connecting...'}</div>
                        </div>
                    </div>
                    <div className="chat-header-icons">
                        <button className="icon-button"><FaSearch /></button>
                        <div className="menu-container">
                            <button 
                                className="icon-button" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMenu(!showMenu);
                                }}
                            >
                                <FaEllipsisV />
                            </button>
                            {showMenu && (
                                <div className="menu-dropdown">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowThemeSelector(true);
                                            setShowMenu(false);
                                        }}
                                    >
                                        Change Chat Background
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div 
                    className="messages-container"
                    style={{
                        backgroundImage: currentTheme ? `url('${BACKEND_URL}/${currentTheme}')` : 'none',
                    }}
                >
                    {messages.map((msg) => (
                        <div 
                            key={msg._id} 
                            className={`message ${msg.username === username ? 'sent' : 'received'}`}
                        >
                            <div className="message-content">
                                <span className="username">{msg.username}</span>
                                {msg.type === 'image' ? (
                                    <div className="image-container">
                                        <img src={msg.url} alt="Shared image" />
                                    </div>
                                ) : (
                                    <span className="text">{msg.text}</span>
                                )}
                                <div className="message-meta">
                                    <span className="timestamp">{formatTime(msg.timestamp)}</span>
                                    {msg.username === username && (
                                        <span className="message-status">
                                            <FaCheckDouble className="read-receipt" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={sendMessage} className="message-input">
                    <button type="button" className="icon-button">
                        <FaSmile />
                    </button>
                    <button 
                        type="button" 
                        className="icon-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        <FaPaperclip />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept="image/*"
                        style={{ display: 'none' }}
                    />
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => {
                            setInput(e.target.value);
                            handleTyping();
                        }}
                        onBlur={handleStopTyping}
                        placeholder="Type a message"
                        disabled={!isConnected}
                    />
                    {input.trim() ? (
                        <button type="submit" className="send-button" disabled={!isConnected}>
                            <FaArrowRight />
                        </button>
                    ) : (
                        <button type="button" className="icon-button">
                            <FaMicrophone />
                        </button>
                    )}
                </form>
            </div>
        </div>
    );
}

export default Chat;