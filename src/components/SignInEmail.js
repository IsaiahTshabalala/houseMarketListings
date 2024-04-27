import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/appConfig';
import { ToastContainer, toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import { userContext } from '../hooks/UserProvider'; // For getting and setting state: current user.
import SignInSMSVerification from './SignInSMSVerification';
import { displayedComponentContext } from './SignIn';

const thisComponentName = 'SignInEmail';

function SignInEmail() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({email: '', password: ''});
    const { userDispatch } = useContext(userContext);
    const [ multiFactorError, setMultiFactorError ] = useState(null);
    const { displayOnlyComponent, resetDisplay} = useContext(displayedComponentContext);
    
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
                        userDispatch({type: 'SIGN_USER_IN', payload: auth.currentUser});
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
                                <button className='w3-margin-small w3-btn w3-round w3-theme-d5'
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
                            <NavLink className='w3-margin w3-center' to='/forgot-password'>Forgot Password</NavLink>
                            <NavLink className='w3-margin w3-center' to='/register'>Register</NavLink>
                        </p>
                    }
                    </>
                                        
                    <ToastContainer/>
                </form>
                
            </div>
    );
}

export default SignInEmail;
