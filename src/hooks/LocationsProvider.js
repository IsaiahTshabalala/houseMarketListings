/**
 * File: ./src/hoooks/LocationsProvider.js
 * Description: Context hook used to keep record of the current and previous urls (Up to 10 recent locations). 
 * Works together with the LocationsRecorder component.
 * Date       Dev   Version  Description
 * 2024/06/13 ITA   1.00     Genesis.
 * 2024/08/07 ITA   1.02     Record up to 10 previous url locations.
 */
import { createContext, useRef } from "react";
import PropTypes from 'prop-types';

const locationsContext = createContext();

function LocationsProvider({children}) {
    const locationsRef = useRef([]);
    
    function addLocation(theLocation) {
        const maxLength = 10;
        locationsRef.current.splice(0, 0, theLocation); // Pre-pend the location to the array.
        const currLength = locationsRef.current.length;

        if (currLength > maxLength) // Keep locations to the allowed maximum.
            locationsRef.current.splice(maxLength, currLength - maxLength);
    } // function addLocation(theLocation) {
    
    function getLocations() {
        return locationsRef.current;
    }

    return (
        <locationsContext.Provider
            value={{
                addLocation,
                getLocations
            }}>
            {children}
        </locationsContext.Provider>
    );
}

LocationsProvider.propTypes = {
    children: PropTypes.element.isRequired
};

export default LocationsProvider;
export {locationsContext};