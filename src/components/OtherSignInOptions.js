/**
 * File: ./components/OtherSignInOptions.js
 * Description: Provide user with sign options involving authentication providers like Google, etc
 * Date        Dev   Version  Description
 * 2024/09/18  ITA   1.01     Import context directly.
 * 2024/10/10  ITA   1.02     Provide the pipe dilimited list of OAuth providers in the .env file.
 *                            This enables one to turn on/off OAuth providers as per what can be afforded.
 *                            Remove the dispatch actions, since they are automatically performed by the top-most, CurrentUserState component of this web application.
 */
import { useState } from "react";
import { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, OAuthProvider } from "firebase/auth";
import { auth } from '../config/appConfig.js';
import { useNavigate } from 'react-router-dom';
import { BsGoogle, BsFacebook } from 'react-icons/bs';
import { FaYahoo } from 'react-icons/fa';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from "./toastifyTheme.js";
import SignInSMSVerification from "./SignInSMSVerification.js";
import { useDisplayedComponentContext } from './SignIn';

const thisComponentName = 'OtherSignInOptions';

function OtherSignInOptions() {
    const [multiFactorError, setMultiFactorError] = useState(null);
    const [providerName, setProviderName] = useState(null);
    const { displayOnlyComponent, resetDisplay } = useDisplayedComponentContext();
    const navigate = useNavigate();

    const envParams = (()=> {
      // Pipe delimited list of OAuth Providers.
      let oAuthProviders = process.env.REACT_APP_OAUTH_PROVIDERS? process.env.REACT_APP_OAUTH_PROVIDERS.toLowerCase() : ''; // Get the pipe delimited list of oAuth providers.
      oAuthProviders = oAuthProviders.split('|');

      return Object.freeze({
        oAuthProviders
      });
    })();    

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
        navigate('/'); // Go to home page.
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
                  {(envParams.oAuthProviders.length > 0) &&
                    <>
                      <p className='w3-margin'>Continue with</p>
                  
                      <div>                      
                        {envParams.oAuthProviders.includes('google') &&
                          <div className='w3-margin side-by-side'>
                            <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('google')}>
                                <span><BsGoogle/></span>
                            </button>
                          </div>
                        }

                        {envParams.oAuthProviders.includes('facebook') &&
                          <div className='w3-margin side-by-side'>
                            <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('facebook')}>
                                <span><BsFacebook/></span>
                            </button>              
                          </div>
                        }

                        {envParams.oAuthProviders.includes('yahoo') &&                      
                          <div className='w3-margin side-by-side'>                  
                            <button className='w3-btn w3-round w3-theme-d5' type='button' onClick={e=> signIn('yahoo')}>
                              <span><FaYahoo/></span>
                            </button>
                          </div>
                        }
                      </div>
                    </>
                  } 
              </>
              :
              <>
                <h2 className='w3-margin-top w3-padding'>{getProviderIcon()} Continue with {providerName}</h2>
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
