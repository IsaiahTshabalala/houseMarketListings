import { useState, useContext } from "react";
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from "firebase/auth";
import { auth } from '../config/appConfig.js';
import { useNavigate } from 'react-router-dom';
import { BsGoogle, BsFacebook } from 'react-icons/bs';
import { FaYahoo } from 'react-icons/fa';
import { userContext } from "../hooks/UserProvider.js";
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from "./toastifyTheme.js";
import SignInSMSVerification from "./SignInSMSVerification.js";
import { displayedComponentContext } from './SignIn';

const thisComponentName = 'OtherSignInOptions';

function OtherSignInOptions() {
    const { userDispatch } = useContext(userContext);
    const [multiFactorError, setMultiFactorError] = useState(null);
    const [providerName, setProviderName] = useState(null);
    const { displayOnlyComponent, resetDisplay } = useContext(displayedComponentContext);
    const navigate = useNavigate();

    function getProviderIcon() {
      switch(providerName) {
        case 'google':
          return <BsGoogle/>;
          break;
        case 'facebook':
          return <BsFacebook/>;
          break;
        case 'yahoo':
          return <FaYahoo/>;
          break;
        default:
          return <span>providerName</span>;
          break;
      } // switch(providerName)

    } // function getProviderIcon() 

    function signIn(nameOfProvider) {
      setProviderName(nameOfProvider);
      let provider = null;
      switch(nameOfProvider) {
        case 'google':
          provider = new GoogleAuthProvider();
          break;
        case 'facebook':
          provider = new FacebookAuthProvider();
          break;
        case 'yahoo':
          provider = new OAuthProvider('yahoo.com');
          break;
      } // switch(nameOfProvider)

      signInWithPopup(auth, provider)
      .then((result) => {        
        // Update the currentUser state with the signed-in user info.
        userDispatch({type: 'SIGN_USER_IN', payload: result.user});
        navigate('/');
      }).catch((error) => {
        if (error.code === 'auth/multi-factor-auth-required') {
          displayOnlyComponent(thisComponentName);
          setMultiFactorError(error);
        } // else if (error.code === 'auth/multi-factor-auth-required')
        else {
          const theError = 'code' in error? error.code + '. ' + error : error;
          toast.error('Error: ' + theError, toastifyTheme);
        } // else
      });
    } // function signIn()

    function reset() {
      setMultiFactorError(null); // This will clear phone verification.
      resetDisplay();
    } // function reset()

    return (
        <div className='w3-container'>
          <>
            {multiFactorError === null?
              <>
                  <p className='w3-margin'>Continue with</p>
                  <div>
                    <div className='w3-margin side-by-side'>
                      <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('google')}>
                          <span><BsGoogle/></span>
                      </button>
                    </div>
                    
                    <div className='w3-margin side-by-side'>
                      <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('facebook')}>
                          <span><BsFacebook/></span>
                      </button>              
                    </div>
                    
                    <div className='w3-margin side-by-side'>                  
                      <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('yahoo')}>
                        <span><FaYahoo/></span>
                      </button>
                    </div>
                  </div>
              </>
              :
              <>
                <h2>{getProviderIcon()} Continue with {providerName}</h2>
                <SignInSMSVerification multiFactorError={multiFactorError}/>
                <p>
                  <button className='w3-margin w3-btn w3-round w3-theme-d5' type='button' 
                          onClick={reset}>Cancel</button>
                </p>
              </>
            }
          </>

          <ToastContainer/>
        </div>
    ); // return ();
}

export default OtherSignInOptions;
