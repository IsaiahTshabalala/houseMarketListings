/**
 * File: ./src/Signin.js
 * Description: Facilitate user login.
 * 
 * Date        Dev   Version  Description
 * 2023/12/10  ITA   1.00     Genesis.
 * 2024/06/10  ITA   1.01     Add header comment. 
 *                            Change the links (NavLinks) to appear as buttons.
 * 2024/09/18  ITA   1.02     Export context in ready-made form, eliminated the need for calling useContext where it is used.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState, createContext, useContext, useEffect } from 'react';
import SignInEmail from './SignInEmail';
import { auth, isSignedIn } from '../config/appConfig';
import OtherSignInOptions from './OtherSignInOptions';
import { FaHome } from 'react-icons/fa';

const displayedComponentContext = createContext(); // To be used to keep track of which nested components to hide or display.

function SignIn() {
    // when displayedComponent is set to null, all nested components to display.
    // Otherwise only the component with the specified name is displayed.
    const [displayedComponent, setDisplayedComponent] = useState(null);

    const navigate = useNavigate();
    
    function displayOnlyComponent(name) {
    // Set which component to be displayed.
        setDisplayedComponent(name);
    }

    function resetDisplay() {
    // All components to be displayed.
        setDisplayedComponent(null);
    }

    useEffect(()=> {
        if (isSignedIn())
            navigate('/');
    }, [auth.currentUser]);

    return (
        <div className='w3-container'>
            <displayedComponentContext.Provider 
                value={{
                            displayOnlyComponent,
                            resetDisplay
                        }}>
                <>
                    {(displayedComponent === null || displayedComponent === 'SignInEmail') &&
                        <SignInEmail/>
                    }
                </>
                <>
                    {(displayedComponent === null || displayedComponent === 'OtherSignInOptions') &&
                        <>
                            <OtherSignInOptions />
                        </>
                    }
                </>
                <>
                    {displayedComponent === null &&
                        <p className='w3-margin'>           
                            <Link className='w3-margin w3-btn w3-round w3-theme-d5 w3-padding w3-large' to='/'><FaHome/></Link>
                        </p>
                    }
                </>
            </displayedComponentContext.Provider>
        </div>
    );
} // function SignIn() {

export default SignIn;

export function useDisplayedComponentContext() {
    return useContext(displayedComponentContext);
}
