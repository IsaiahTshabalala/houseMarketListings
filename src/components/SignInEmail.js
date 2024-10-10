/**
 * File: ./src/components/SignInEmail.js
 * Description: Facilitate login using email.
 * 
 * Date        Dev   Description
 * 2023/07/26  ITA   Genesis.
 * 2024/06/10  ITA   Add header commment
 *                   Navlinks to appear as buttons.
 * 2024/09/17  ITA   Import context directly. Sign-in dispatch actions removed, since they are auto-performed by the top-most component (CurrentUserState) of this web app.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/appConfig';
import { ToastContainer, toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import SignInSMSVerification from './SignInSMSVerification';
import { useDisplayedComponentContext } from './SignIn';

const thisComponentName = 'SignInEmail';

function SignInEmail() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({email: '', password: ''});
    const [ multiFactorError, setMultiFactorError ] = useState(null);
    const { displayOnlyComponent, resetDisplay} = useDisplayedComponentContext();
    
    function handleChange(e) {
        setFormData(prev=> {
            return {...prev, [e.target.name]: e.target.value};
        });
    } // function handleChange(e)

    function reset() {
        setFormData({email: '', password: ''}); // Clear inputs
        setMultiFactorError(null); // Clear phone verification.
        resetDisplay(); // This will make this component and its sibling <OtherSignInOptions/> to display.
    }

    async function submitData(e) {
        e.preventDefault();

        await signInWithEmailAndPassword(auth, formData.email, formData.password)
        .then((userCredential) => {
            if (auth.currentUser !== null) {
                if ('emailVerified' in auth.currentUser) {
                    if (auth.currentUser.emailVerified) {
                        navigate('/');
                    } // if (auth.currentUser.emailVerified)
                    else
                        navigate('/email-verification-sent');
                }
            }
            else
                toast.error('Some error occurred. Please try again later.', toastifyTheme);
        })
        .catch(error => {
            if (['auth/wrong-password', 'auth/user-not-found'].includes(error.code))
                toast.error('User/password combination not found!!', toastifyTheme);
            
            // This happens when the user has been enrolled for additional authentication:
            else if (error.code === 'auth/multi-factor-auth-required') {
                displayOnlyComponent(thisComponentName);
                setMultiFactorError(error);
            } // else if (error.code === 'auth/multi-factor-auth-required')
            else {
                const theError = 'code' in error? error.code : error;
                toast.error('Error: ' + theError, toastifyTheme);
            } // else
        }); // .catch(error
    } // async function submitData(e)

    return (
            <div className='w3-container'>
                <form onSubmit={submitData}>
                    <h2 className='w3-margin'>Sign in</h2>

                    <>
                        {multiFactorError === null &&
                            <>
                                <p>
                                    <label htmlFor='email'>Email</label>
                                    <input name='email' maxLength={70} className='w3-input w3-input-theme-1' type='email' aria-label='Email' 
                                                    autoComplete='off' onChange={handleChange} value={formData.email} required/>
                                </p>

                                <p>
                                    <label htmlFor='email'>Password</label>
                                    <input name='password' maxLength={30} className='w3-input w3-input-theme-1' type='password' aria-label='Password' 
                                                    autoComplete='off' onChange={handleChange} value={formData.password} required/>
                                </p>
                            </>
                        }
                    </>

                    <>
                        {multiFactorError !== null &&
                            <SignInSMSVerification multiFactorError={multiFactorError} />
                        }
                    </>

                    <>
                        {multiFactorError !== null?
                            <p>
                                <button className='w3-margin w3-btn w3-round w3-theme-d5'
                                                type='button' onClick={reset}>Cancel</button>
                            </p>
                            :
                            <div className='w3-margin'>
                                <button className='w3-btn w3-round w3-theme-d5' type='submit'>Sign in</button>
                            </div>
                        }                 
                    </>
                                        
                    <>
                    {multiFactorError === null &&
                        <p>
                            <Link className='w3-btn w3-round w3-margin w3-center w3-theme-d5' to='/forgot-password'>Forgot Password</Link>
                            <Link className='w3-btn w3-round w3-margin w3-center w3-theme-d5' to='/register'>Register</Link>
                        </p>
                    }
                    </>
                                        
                    <ToastContainer/>
                </form>
                
            </div>
    );
}

export default SignInEmail;
