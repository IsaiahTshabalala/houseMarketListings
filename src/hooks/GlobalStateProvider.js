/**
 * File: ./src/components/GlobalStateProviderr.js
 * Description:
 * UseContext hook to provide for global state. Currently, only info about the currently signed in user and the in app browsing history (locations) are catered for.
 * 
 * Date        Dev  Version  Description
 * 2024/09/18  ITA  1.00     Genesis.
 */
import { createContext, useReducer, useContext } from "react";
import PropTypes from 'prop-types';
import loDash from 'lodash';

// Actions
export const ActionFunctions = Object.freeze({
    // auth:
    authSignIn: (payload)=> {
        return {
            type: 'auth/signIn',
            payload
        };
    },
    authSignOut: ()=> {
        return {
            type: 'auth/signOut'
        };
    },
    authSetPersonalDetails: (payload)=> {
        return {
            type: 'auth/setPersonalDetails',
            payload
        };
    },
    recordLocation: (payload)=> {
        return {
            type: 'locations/add',
            payload
        };
    }
});

const globalStateContext = createContext();

function GlobalStateProvider({children}) {
    const [globalState, dispatch] = useReducer(globalReducer, {});

    /**Get any slice of the global state */
    function getSlice(path) {
        return path? loDash.get(globalState, path) : globalState;
    }
    
    return (
        <globalStateContext.Provider
            value={{
                getSlice,
                dispatch
            }}>
            {children}
        </globalStateContext.Provider>
    );
} // function GlobalStateProvider({children})

GlobalStateProvider.propTypes = {
    children: PropTypes.node.isRequired
};

function globalReducer(state, action) {
    let stateUpdate = {...state}; // Default value. If the dev choose a wrong action type, the state should stay as is.
    const maxLength = 5;
    switch (action.type) {
        case 'auth/signIn':
            stateUpdate = {
                authCurrentUser: action.payload
            };
            break;
        case 'auth/signOut':
            delete stateUpdate.authCurrentUser;
            break;
        case 'auth/setPersonalDetails':
            if (stateUpdate?.authCurrentUser)
                stateUpdate.authCurrentUser.personalDetails = action.payload;
            break;
        case 'locations/add': // add to the list of url locations previously browsed, sorted in order of most recent.
            if (stateUpdate?.locations) {
                const locations = state.locations;
                let updatedLocations = [action.payload];
                for (let idx = 0; idx < locations.length; idx++) {
                    if (idx >= maxLength - 1)
                        break;

                    updatedLocations = [...updatedLocations, locations[idx]];
                } // for (let idx = 0; idx < locations.length; idx++) {
                stateUpdate.locations = updatedLocations;
            } // if (stateUpdate?.locations && stateUpdate.locations?.length) {
            else {
                stateUpdate.locations = [action.payload];
            }
            break;
        default:
            break;
    } // switch (action.type)
    return stateUpdate;
} // function globalReducer(state, action)


export default GlobalStateProvider;

export function useGlobalStateContext() {
    return useContext(globalStateContext);
}