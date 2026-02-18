/**
 * File: ./src/components/CurrentUserState.js
 * Purpose: Component to keep track of current user state (signed in, signed out, updated account details).
 * Start Date  End Date   Dev   Description   
 * 2024/04/02             ITA   Genesis.
 * 2024/06/17             ITA   Convert this component to a wrap other components in it.
 *                              Such that the error page is displayed in instances where data cannot be retrieved from Firestore.
 * 2024/10/10             ITA   Current user state moved to the Global State.
 * 2026/01/08  2026/01/08 ITA   Imported a specific object (node) needed from prop-types. Reducing build time.
 *                              Improved the authentication check to be more direct: signed in or not.
 * 2026/02/16  2026/02/16 ITA   Dispatch actions are now using specific dispatch functions, requiring only a payload; increased simplicity.
 */
import { node } from 'prop-types';
import { useEffect, useState } from "react";
import { useGlobalStateContext } from "../hooks/GlobalStateProvider";
import { auth, isSignedIn } from "../config/appConfig";
import { getUser } from "../utilityFunctions/firestoreComms";
import ErrorPage2 from './ErrorPage2';

function CurrentUserState({children}) {
    const { dispatchSignIn, dispatchPersonalDetails, dispatchSignOut } = useGlobalStateContext();
    const [error, setError] = useState(null);

    useEffect(()=> {
        (async ()=> {
            if (isSignedIn()) {
                try {
                    dispatchSignIn(auth.currentUser);
                    let user = await getUser(auth.currentUser.uid);

                    if (user) {
                        dispatchPersonalDetails(user);
                    }
                } catch (error) {
                    console.log(error);
                    setError('Could not fetch data from the database. Please reload the page.');
                }
            }
            else {
                dispatchSignOut();
            }
            })();
    }, [auth?.currentUser?.emailVerified === true && auth?.currentUser?.isAnonymous === false]);

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
    children: node.isRequired
};

export default CurrentUserState;
