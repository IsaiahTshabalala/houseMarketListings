/**
 * File: ./src/components/SignInSMSVerification.js
 * Description:
 * Facilitate sending SMS authentication to the user.
 * 
 * Date        Dev   Version  Description
 * 2023/12/07  ITA   1.00     Genesis
 * 2024/06/10  ITA   1.01     Add header comment.
 *                            The Navlinks to appear as buttons.
 * 2024/09/11  ITA   1.01     Sign-in dispatch action removed, since it is automatically performed by the top-most, CurrentUserState component of this web application.
 *                            Context to be imported directly.
 */
import { getMultiFactorResolver, PhoneAuthProvider, 
         PhoneMultiFactorGenerator, RecaptchaVerifier } from 'firebase/auth';
import { useState, useEffect } from 'react';
import { auth } from '../config/appConfig.js';
import { FaTimesCircle } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme.js';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

function SignInSMSVerification({multiFactorError}) {    
    // resolver is the multi-factor resolver.
    const [verificationId, setVerificationId] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [phoneHintIndex, setPhoneHintIndex] = useState(-1); // Index where the phone auth hint may be found in resolver.hints. 
                                                              // Value of -1 means no phone auth hint.
    const [resolver, setResolver] = useState(null);
    const [firstRender, setFirstRender] = useState(true); // On first render, must create the resolver object, without which we cannot have the
                                                        // hints object, that contains the clues about user's authentication factors.
                                                        // We use the hints array to identify if the user has the multi-factor-phone-auth.
                                                        // Without multifactor-phone-auth in the hints, the link that the user can click
                                                        // to verify themselves using their phone number is not visible.
                                                        // We keep track of first render to make sure that if it is true. We know that the
                                                        // resolver object has been created, therefore no need create a new resolver while
                                                        // discarding the one that was created on first render for the sake of opening
                                                        // the option that the user can click to verify. But reuse that resolver.
                                                        // This resolver will be created in useEffect on first render.
    const [pinCode, setPinCode] = useState('');
    const [modalOn, setModalOn] = useState(false);
    const navigate = useNavigate();

    function createResolverAndPhoneHintIndex() {
        const resolve = getMultiFactorResolver(auth, multiFactorError);
        let index = -1;
        if (resolve !== null && resolve !== undefined)
            index = resolve.hints.findIndex(hint=> {
                return hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID;
            }); // if (resolve !== null && resolve !== undefined)
        setResolver(resolve);
        setPhoneHintIndex(index);
    } // function createResolverAndPhoneHintIndex()

    async function createVerificationId(trigger) {
        let tempCaptcha = null;        
        try {
            if (recaptchaVerifier === null) {
                setRecaptchaVerifier(prev=> {
                    tempCaptcha = new RecaptchaVerifier(auth, 'recaptcha-container');
                    return tempCaptcha;
                });
            } // if (recaptchaVerifier === null)
            else
                tempCaptcha = recaptchaVerifier;

            if (firstRender) // If firstRender is true, there is a resolver that was created on first render, and has not been used.
                setFirstRender(false);
            else
                createResolverAndPhoneHintIndex();
            
            // If this is not the first time (render) that the resolver has been created, create a new one.
            if (phoneHintIndex >= 0) {
                const phoneInfoOptions = {
                    multiFactorHint: resolver.hints[phoneHintIndex],
                    session: resolver.session
                }; // const phoneInfoOptions

                const phoneAuthProvider = new PhoneAuthProvider(auth);
                let result = null;
                // Send the verification code and return the verification Id.
                await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, tempCaptcha)
                        .then(verId=> {
                            setVerificationId(verId);
                        })
                        .catch(error=> {
                            result = error;
                        });
                if (result === null)
                    return Promise.resolve(true);
                else
                    return Promise.reject(result);
            } // if (phoneHintIndex > 0)
            else
                return Promise.reject('Hint of type ' + PhoneMultiFactorGenerator.FACTOR_ID + ' not found.');
            
        } catch (error) {
            recaptchaVerifier.clear();
            toast.error('Error: ' + error.code + '. Could not start phone verification process. Please try again.', toastifyTheme);
            return Promise.reject('Error: ' + error.code + '. Could not start phone verification process. Please try again.');
        } // catch (error)

    } // async function createVerificationId()
    
    function clear() {
        setModalOn(false);
        setPinCode('');
    } // clear()

    async function prepareVerification() {
        if (verificationId === null)
            await createVerificationId() // Create verificationId and open modal box for user to enter verification code.
                    .then(result=> setModalOn(true)) // Open the modal dialog for the user to enter the correct pin code.
                    .catch(error=> toast.error('Error: ' + error + '. Please try again.', toastifyTheme));
        // else if the verificationId was not used, such as when the user did not enter the correct verification code
        // no need to create a new verificationId, just open the modal dialog for the user to enter the corrent pin code.
        else 
            setModalOn(true);
    } // function prepareVerification()

    useEffect(() => {
        if (firstRender) {
            createResolverAndPhoneHintIndex();
        } // if (!firstRender)
    }, [firstRender]); // useEffect(() =>
    
    
    async function verifyPinCode() {
        try {
            const cred = PhoneAuthProvider.credential(verificationId, pinCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
            
            // Complete sign-in ...
            await resolver.resolveSignIn(multiFactorAssertion);
            toast.success('Congratulations! You have been signed in.', toastifyTheme);
            navigate('/');
            setVerificationId(null); // Clear the verificationId that was used up upon successful verification.
        } catch (error) {
            const theError = 'code' in error? error.code + '. ' + error : error;
            toast.error('Error: ' + theError, toastifyTheme);
        } finally {
            setModalOn(false); // Close the modal dialog.
            setPinCode(''); // Clear pin code that the user has entered.
        } // finally
    } // function verifyPinCode()     
      
    return (
        <>
        {
            <div className='w3-container'>             
                <div className='w3-padding' id='recaptcha-container'></div>

                <ToastContainer/>
                <>
                    {phoneHintIndex >= 0 &&
                        <Link className='w3-btn w3-round w3-theme-d5' onClick={prepareVerification}>Verify phone number</Link>
                    }
                </>

                <div id='id01' className='w3-modal' style={{display: modalOn? 'block': 'none'}}>

                    <div className='w3-modal-content'>
                        <div className='w3-container w3-theme'>
                            <span onClick={clear} className='w3-button w3-display-topright'><FaTimesCircle/></span>
                            <h4>
                                Enter the code sent to your phone <span>
                                {resolver !== null && resolver.hints[phoneHintIndex].phoneNumber}.</span>
                            </h4>
                            
                            <p>
                                <label htmlFor='pinCode'>Verification Code</label><br/>
                                <input name='pinCode' className='w3-input w3-input-theme-1' type='text' aria-required={true} 
                                        onChange={e=> setPinCode(prev=> e.target.value)} value={pinCode}/>
                            </p>
                            
                            <div className='w3-padding'>
                                <button className='w3-button w3-btn w3-margin-small w3-theme-d5 w3-round' type='button'
                                        onClick={verifyPinCode}>Submit Code</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        }
        </>
    );
}

SignInSMSVerification.propTypes = {
    multiFactorError: PropTypes.object.isRequired
};

export default SignInSMSVerification;
