/**
 * File: ./src/components/UserProvider.js
 * Description:
 * UseContext hook to provide for setting up the currently signed in user.
 * 
 * Date        Dev  Version  Description
 * 2023/08/01  ITA  1.00     Genesis.
 * 2024/05/04  ITA  1.01     Add comment header.
 *                           Current user initialised to null before sign in and during sign out.
 *                           User's Firebase authentication data to be stored in the authCurrentUser field.
 */
import { createContext, useReducer } from "react";
import PropTypes from 'prop-types';

const userContext = createContext();

function UserProvider({children}) {
    const [currentUser, userDispatch] = useReducer(userReducer, null);
    
    return (
        <userContext.Provider
            value={{
                currentUser,
                userDispatch
            }}>
            {children}
        </userContext.Provider>
    );
} // function UserProvider({children})

UserProvider.propTypes = {
    children: PropTypes.node.isRequired
};

function userReducer(state, action) {
    let stateUpdate = state; // Default value. If the dev choose a wrong action type, the state should stay as is.
    switch (action.type) {
        case 'SIGN_USER_IN':
            stateUpdate = {authCurrentUser: action.payload};
            break;
        case 'SIGN_USER_OUT':
            stateUpdate = null;
            break;
        case 'SET_PERSONAL_DETAILS':
            stateUpdate = {...state, personalDetails: action.payload};
            break;
    } // switch (action.type)
    return stateUpdate;
} // function userReducer(state, action)


export default UserProvider;
export {userContext};