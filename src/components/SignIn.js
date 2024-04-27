import { NavLink, useNavigate } from 'react-router-dom';
import { useState, createContext, useEffect } from 'react';
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
                        <p>           
                            <NavLink className='w3-margin w3-padding w3-large' to='/'><FaHome/></NavLink>
                        </p>
                    }
                </>
            </displayedComponentContext.Provider>
        </div>
    );
} // function SignIn() {

export default SignIn;
export {displayedComponentContext};
