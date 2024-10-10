/**
 * File: ./src/components/LocationsTracker.js
 * Description: Component to be placed on top of the components in the routes, to keep record of
 *              the recent urls the user visited.
 * Date       Dev   Version  Description
 * 2024/06/13 ITA   1.00     Genesis.
 * 2024/10/10 ITA   1.02     Correctly name the component to match the file name.
 *                           Dispatch action and getSlice replace the calls to addLocation() and getLocations(), as the locations state is moved to the Global State.
 *                           
 */
import { useEffect } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { useGlobalStateContext, ActionFunctions } from "../hooks/GlobalStateProvider";

function LocationsRecorder({children}) {
    const {dispatch, getSlice} = useGlobalStateContext();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(()=> {
        const locations = getSlice('locations');
        dispatch(ActionFunctions.recordLocation(location.pathname));

        // If the user is either visiting this app anew or re-loading it on their browser. Go to the home page.
        if (!(locations?.length))
            navigate('/');
    }, [location.pathname]);

    return (
        <></>
    );
}

export default LocationsRecorder;