/**
 * File: ../src/components/Protected.js
 * Purpose: To wrap components that require user to 
 */
import { useContext } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { isSignedIn } from '../config/appConfig.js';
import PropTypes from 'prop-types';
import { userContext } from '../hooks/UserProvider.js';
import ErrorAlert from './ErrorAlert.js';

function Protected({children}) {
    const { currentUser } = useContext(userContext);
    
    return ( 
        <div>
        {isSignedIn()?
            <>                
            {(currentUser.personalDetails !== null && currentUser.personalDetails !== undefined)?
                <>
                    {children}
                </>
                :
                <>
                    <ErrorAlert message='You must complete your registration to be able to view this page!'/>
                    <div className='w3-margin'>
                        <NavLink to='/my-profile/account'>Click here to complete registration</NavLink>
                    </div>
                </>
            }
            </>
            :
            <>
                <Navigate to='/signin'/>
            </>
        }
        </div>
    );
}

Protected.propTypes = {
    children: PropTypes.element.isRequired
};

export default Protected;
