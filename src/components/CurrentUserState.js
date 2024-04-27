/**
 * File: ./src/components/CurrentUserState.js
 * Purpose: The top-most component to keep track of and current user state (signed in, signed out, updated account details).
 */

import { useEffect, useContext, useState } from "react";
import { userContext } from "../hooks/UserProvider";
import { auth, isSignedIn } from "../config/appConfig";
import { getUser } from "../utilityFunctions/firestoreComms";
import { useNavigate } from "react-router-dom";

function CurrentUserState() {
    const {userDispatch} = useContext(userContext);
    const navigate = useNavigate();

    useEffect(()=> {
        (async ()=> {            
            if (isSignedIn()) {
              try {
                userDispatch({type: "SIGN_USER_IN", payload: auth.currentUser});
                const user = await getUser(auth.currentUser.uid);
                if (user !== null) {
                    userDispatch({type: "SET_PERSONAL_DETAILS", payload: user});
                }                
                } catch (error) {
                    navigate('error/error-occurred');
                }
            }
            else
                userDispatch("SIGN_USER_OUT");
            })();
    }, [auth.currentUser]);

    return (
            <></>
    );
}

export default CurrentUserState;
