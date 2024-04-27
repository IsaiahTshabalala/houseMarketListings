
import { multiFactor, PhoneAuthProvider, PhoneMultiFactorGenerator,
         RecaptchaVerifier } from 'firebase/auth';
import { useState } from 'react';
import { auth } from '../config/appConfig.js';
import { FaTimesCircle } from 'react-icons/fa';
import {toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme.js';
import { isValidDisplayName, isValidPhoneNo } from '../utilityFunctions/commonFunctions.js';
import { NavLink } from 'react-router-dom';
import Loader from './Loader.js';

function EnrolUserForSMSAuth({phoneNumber, displayName}) {    
    const [pinCode, setPinCode] = useState('');
    const [modalOn, setModalOn] = useState(false);
    const [verificationId, setVerificationId] = useState(null);
    const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);
    const [multiFactorUser] = useState(multiFactor(auth.currentUser));
    const [phoneVerified, setPhoneVerified] = useState(false);
    const [loading, setIsLoading] = useState(false);

    async function createVerificationId() {
        try {
            let tempCaptcha;

            if (recaptchaVerifier === null)         
                setRecaptchaVerifier(prev=> {
                    tempCaptcha = new RecaptchaVerifier(auth, 'recaptcha-container');
                    return tempCaptcha;
                });
            else
                tempCaptcha = recaptchaVerifier;

            const multiFactorSession = await multiFactorUser.getSession();            
            const phoneInfoOptions = {
                phoneNumber: convertToInternational(phoneNumber),
                session: multiFactorSession
            };

            const phoneAuthProvider = new PhoneAuthProvider(auth);
            // Send SMS verification code
            const verId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, tempCaptcha);
            setVerificationId(verId); // setVerificationId
            return Promise.resolve(true);
        } catch(error) {
            if (error.code === 'auth/factor-already-in-use')
                setPhoneVerified(true);

            return Promise.reject(error);
        } // catch(e)
    } // async function createVerificationId()

    async function prepareVerification() {
        if (!phoneVerified) {
            if (verificationId === null) // Create new verificationId if only if the current one has been used up.
                await createVerificationId()
                        .then(result=> setModalOn(true))
                        .catch(error=> {
                            let theError = error;
                            if (error.code === 'auth/second-factor-already-in-use') {
                                theError = 'You are already enrolled for second factor authentication.';
                                setPhoneVerified(true);
                            }
                            else
                                theError = 'Error: ' + error + '. Please try again.';
                            
                            toast.error(theError, toastifyTheme)
                        }); // .catch(error)=> {}
            else
                setModalOn(true);

        } // if (!phoneVerified) {
        else
            toast.error('You have already been enrolled for phone factor authentication.', toastifyTheme);
    } // function prepareVerification()

    function clear() {
        setModalOn(false);
        setPinCode('');
    } // clear()

    async function verifyPinCode() {
        try {
            // Ask user for the verification code. Then:
            const cred = PhoneAuthProvider.credential(verificationId, pinCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
            
            // Complete enrollment.
            setIsLoading(true); // task in progress on the next line
            await multiFactorUser.enroll(multiFactorAssertion, displayName);
            setIsLoading(false); // task done
            toast.success('Congratulations! Your phone number has been enrolled for authentication.', toastifyTheme);
            setPhoneVerified(true);
            setVerificationId(null); // Clear the verificationId that was used up.
            
        } catch (error) {
            toast.error('Error: ' + error + '. Please try again.', toastifyTheme);
        } finally {
            setModalOn(false); // Close the modal dialog.
            setIsLoading(false);
        } // finally
    } // function verifyPinCode()

    if (loading)
        return <Loader message='Busy, please wait...'/>;

    return (
        <>
            {isValidPhoneNo(phoneNumber) && isValidDisplayName(displayName) && (!phoneVerified) &&
            <div className='w3-container'>             
                <div className='w3-padding' id='recaptcha-container'></div>
                
                <>
                    {!phoneVerified &&
                        <NavLink onClick={prepareVerification}>Enrol for phone number authentication</NavLink>
                    }
                </>
                
                
                <ToastContainer/>

                <div id='id01' className='w3-modal' style={{display: modalOn? 'block': 'none'}}>

                    <div className='w3-modal-content'>
                        <div className='w3-container w3-theme'>
                            <span onClick={clear} className='w3-button w3-display-topright'><FaTimesCircle/></span>
                            <h6>A verification code has been sent to your phone ****{phoneNumber.slice(6)}. Please enter it here.</h6>
                            
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
} // function EnrolUserForSMSAuth({phoneNumber, displayName})

function convertToInternational(phoneNumber) {
    // Convert a local South African phone number to an international format. e.g. 0713413412 to +27713413412
    return '+27' + Number.parseInt(phoneNumber);
} // export function convertToInternational(phoneNumber)

export default EnrolUserForSMSAuth;