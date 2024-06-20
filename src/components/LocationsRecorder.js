/**
 * File: ./src/components/LocationsTracker.js
 * Description: Component to be placed on top of the components in the routes, to keep record of
 *              the recent urls the user visited.
 * Date       Dev   Version  Description
 * 2024/06/13 ITA   1.00     Genesis.
 */

import { useContext, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { locationsContext } from "../hooks/LocationsProvider";

function LocationsTracker() {
    const {addLocation, getLocations} = useContext(locationsContext);
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(()=> {
        addLocation(location.pathname);

        // If the user is either visiting this app anew or re-loading it on their browser. Go to the home page.
        if (getLocations().length === 1)
            navigate('/');
    }, [location]);

    return (
        <></>
    );
}

export default LocationsTracker;