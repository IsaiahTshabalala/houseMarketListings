/**
 * File: ./src/components/CurrentUserState.js
 * Purpose: Component to keep track of current user state (signed in, signed out, updated account details).
 * Date        Dev   Description   
 * 2024/04/02  ITA   Genesis.
 * 2024/06/17  ITA   Convert this component to a wrap other components in it.
                     Such that the error page is displayed in instances where data cannot be retrieved from Firestore.
 * 
 */
import PropTypes from 'prop-types';
import { useEffect, useContext, useState } from "react";
import { userContext } from "../hooks/UserProvider";
import { auth, isSignedIn } from "../config/appConfig";
import { getUser } from "../utilityFunctions/firestoreComms";
import ErrorPage2 from './ErrorPage2';

function CurrentUserState({children}) {
    const {currentUser, userDispatch} = useContext(userContext);
    const [error, setError] = useState(null);

    useEffect(()=> {
        (async ()=> {            
            if (isSignedIn()) {
                try {
                    userDispatch({type: "SIGN_USER_IN", payload: auth.currentUser});
                    let user = null;

                    user = await getUser(auth.currentUser.uid);
                    if (user !== null) {
                        userDispatch({type: "SET_PERSONAL_DETAILS", payload: user});
                    }
                } catch (error) {
                    setError('Could not fetch data from the database. Please reload the page.');
                }
            }
            else
                userDispatch("SIGN_USER_OUT");
            })();
    }, []);

    return (
        <>
            {error === null?
                children
                :
                <ErrorPage2 message={error}/>          
            }
        </>
    );
}

CurrentUserState.propTypes = {
    children: PropTypes.element.isRequired
};

export default CurrentUserState;
