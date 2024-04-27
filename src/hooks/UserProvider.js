import { createContext, useReducer } from "react";
import PropTypes from 'prop-types';

const userContext = createContext();

function UserProvider({children}) {
    const [currentUser, userDispatch] = useReducer(userReducer, {});
    
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
            stateUpdate = {...action.payload};
            break;
        case 'SIGN_USER_OUT':
            stateUpdate = {};
            break;
        case 'SET_PERSONAL_DETAILS':
            stateUpdate = {...state, personalDetails: action.payload};
            break;
    } // switch (action.type)
    return stateUpdate;
} // function userReducer(state, action)


export default UserProvider;
export {userContext};