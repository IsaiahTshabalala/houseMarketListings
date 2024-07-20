/**
 * File: ./src/components/ForgotPassword.js
 * Description: Help user reset login password.
 * Date        Dev  Version  Description
 * 2023/07/27  ITA  1.00     Genesis.
 * 2024/06/19  ITA  1.01     Add header comment.
 * 2024/07/20  ITA  1.02     Login NavLink to look like a button.
 */
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../config/appConfig";
import { ToastContainer, toast } from "react-toastify";
import toastifyTheme from "./toastifyTheme";

function ForgotPassword() {
    const [formData, setFormData] = useState({email: '', password: ''});
    const navigate = useNavigate();
    const [redirect, setRedirect] = useState('');

    function handleChange(e) {
        setFormData(prev=> {
            return {...prev, [e.target.name]: e.target.value};
        });
    }

    async function submitData(e) {
        e.preventDefault();

        await sendPasswordResetEmail(auth, formData.email)
        .then(()=> {
            setRedirect('/password-reset');
        },
        error=> {
            toast.error(`Error ${error.code}: ${error.message}`, toastifyTheme);
        });
    }

    useEffect(() => {
        if (auth.currentUser !== null)
            navigate('/');
        else if (redirect !== '')
            navigate(redirect);
    }, [redirect]);    

    return (
        <div className='w3-container'>
            <form className='w3-container' onSubmit={submitData}>
                <h1>Forgot Password</h1>
                <p>
                    <label htmlFor='email'>Email</label>
                    <input name='email' autoComplete='off' className='w3-input w3-input-theme-1' type='email' placeholder='Email' aria-label='Email' 
                        onChange={handleChange} value={formData.email}/>
                </p>

                <p>
                    <button className='w3-margin-small w3-btn w3-round w3-theme-d5' type='submit'>Submit</button>
                </p>

                <p>
                    <NavLink className='w3-margin w3-btn w3-round w3-theme-d5' to='/signin'>Sign in</NavLink>
                </p>
                <ToastContainer/>
            </form>
        </div>
    );
}

export default ForgotPassword;
