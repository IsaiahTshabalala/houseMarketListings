/**
 * File: ./src/components/EmailVerificationSentPage.js
 * Description: Inform the registering (signing up) user that the email verification has been sent.
 * Date         Dev   Version Description
 * 2024/07/28   ITA   1.00    Genesis.
 * 2024/06/10   ITA   1.01    Add header comment. Improve the appearance of the Sign In link.
 */
import { NavLink, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { signOut, sendEmailVerification } from "firebase/auth";
import {auth} from '../config/appConfig';

function EmailVerificationSentPage() {
    const [message, setMessage] = useState();
    const navigate = useNavigate();

    useEffect(() => {
        const credential = auth.currentUser;
        if (credential === null)
            navigate('/signin');

        else if (credential.emailVerified)
            navigate('/');
        else {
            sendEmailVerification(credential)
            .then(() => {
                // Email verification sent!
                setMessage(
                    <>
                        <h3>Email verification link sent!</h3>
                        <p>Please go to your email and click it. Then come back to sign in.</p>
                    </>
                );
            })
            .catch(error=> {
                setMessage(
                    <>
                        <h3>Email verification</h3>
                        <p>You will be asked to verify your email during sign in.</p>
                    </>
                );
            })
            .finally(()=> {
                signOut(auth);
            });
    }
    }, [])    
    
    return (
        <div className='w3-panel w3-padding'>
            {message}
            <p>
                <NavLink className='w3-margin-small w3-btn w3-round w3-theme-d5' to='/signin'>Sign in</NavLink>
            </p>
        </div>
    );
}

export default EmailVerificationSentPage;