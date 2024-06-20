/**
 * File: ./src/hoooks/LocationsProvider.js
 * Description: Context hook used to keep record of the current and previous urls (Up to 4 recent entries). 
 * Works together with the LocationsRecorder component.
 * Date       Dev   Version  Description
 * 2024/06/13 ITA   1.00     Genesis.
 */
import { createContext, useRef } from "react";
import PropTypes from 'prop-types';

const locationsContext = createContext();

function LocationsProvider({children}) {
    const locationsRef = useRef([]);
    
    function addLocation(theLocation) {
        const maxLength = 4;
        locationsRef.current = [theLocation, ...locationsRef.current];

        if (locationsRef.current.length > maxLength)
        locationsRef.current = locationsRef.current.slice(0, maxLength);
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