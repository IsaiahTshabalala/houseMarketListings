/**
 * File: ./src/hooks/SharedVarsProvider.js.
 * Description:
 * A useContext hook that is to be used to enable sharing of variables between components.
 * 
 * Date        Dev    Version Description
 * 2024/02/29  ITA    1.00    Genesis
 * 2024/05/11  ITA    1.01    Add comment header.
 * 2024/09/18  ITA    1.02    Export ready-made context, eliminating the need for components using this context to call useContext.
 */
import { createContext, useContext, useRef } from "react";
import PropTypes from 'prop-types';

const sharedVarsContext = createContext();

export default function SharedVarsProvider({children}) {
    const variables = useRef({});

    function addVar(variableName, value) {
        if (varExists(variableName))
            throw new Error(`Variable ${variableName} already defined!`);

        variables.current[variableName] = value;
    } // function addVar(variableName, value) {

    function varExists(variableName) {
        return variables.current[variableName] !== undefined;
    } // function varExists(variableName) {

    function getVar(variableName) {
        let value = variables.current[variableName];

        if (value === undefined)
            throw new Error(`Variable ${variableName} not found!`);

        return value;
    } // function getVar(variableName) {

    function updateVar(variableName, value) {

        if (!varExists(variableName))
            throw new Error(`Variable ${variableName} not found!`);

        variables.current[variableName] = value;
    } // function updateVar(variableName, value) {

    return (
        <sharedVarsContext.Provider
            value={{
                    addVar,
                    varExists,
                    getVar,
                    updateVar
                }}>
            {children}
        </sharedVarsContext.Provider>
    );
}

SharedVarsProvider.propTypes = {
    children: PropTypes.element.isRequired
};

export function useSharedVarsContext() {
    return useContext(sharedVarsContext);
}