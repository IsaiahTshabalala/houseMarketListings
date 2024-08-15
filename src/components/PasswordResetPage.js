import { NavLink, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { auth } from '../config/appConfig.js';

function PasswordResetPage() {
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.currentUser !== null)
            navigate('/');
    }, []); // useEffect(() => {
    
    return (
        <div className='w3-panel'>
            <h1>Password Reset</h1>
            A password reset message has been sent. Please check your email to reset your password.
            <p>
                <NavLink className='w3-margin w3-btn w3-round w3-theme-d5' to='/signin'>Login</NavLink>
            </p>
        </div>
    );
} // function PasswordResetPage()

export default PasswordResetPage;