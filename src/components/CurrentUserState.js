/**
 * File: ./src/components/CurrentUserState.js
 * Purpose: Component to keep track of current user state (signed in, signed out, updated account details).
 * Date        Dev   Description   
 * 2024/04/02  ITA   Genesis.
 * 2024/06/17  ITA   Convert this component to a wrap other components in it.
 *                   Such that the error page is displayed in instances where data cannot be retrieved from Firestore.
 * 2024/10/10  ITA   Current user state moved to the Global State.
 */
import PropTypes from 'prop-types';
import { useEffect, useState } from "react";
import { useGlobalStateContext, ActionFunctions } from "../hooks/GlobalStateProvider";
import { auth, isSignedIn } from "../config/appConfig";
import { getUser } from "../utilityFunctions/firestoreComms";
import ErrorPage2 from './ErrorPage2';

function CurrentUserState({children}) {
    const {dispatch} = useGlobalStateContext();
    const [error, setError] = useState(null);

    useEffect(()=> {
        (async ()=> {            
            if (isSignedIn()) {
                try {
                    dispatch(ActionFunctions.authSignIn(auth.currentUser));
                    let user = null;
                    user = await getUser(auth.currentUser.uid);
                    if (user) {
                        dispatch(ActionFunctions.authSetPersonalDetails(user));
                    }
                } catch (error) {
                    setError('Could not fetch data from the database. Please reload the page.');
                }
            }
            else
                dispatch(ActionFunctions.authSignOut());
            })();
    }, [auth?.currentUser?.uid]);

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
