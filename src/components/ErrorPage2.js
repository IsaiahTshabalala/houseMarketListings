/**
 * File: ErrorPage2.js
 * Descrpition: Error Page.
 * Start Date   End Date    Dev  Version  Description
 * 2023/07/28               ITA  1.00     Genesis * 2024/05/09   ITA  1.01     Replace Home with Home icon in the Home link.
 * 2024/06/25               ITA  1.01     Remove the link to the home page.
 * 2026/01/06   2026/01/06  ITA  1.02     Imported a specific object, string from prop-types reducing build time.
 */
import { string as stringPropType } from 'prop-types';
import { BiError } from 'react-icons/bi';

function ErrorPage2({message}) {
    return (
        <>
            <div className='w3-panel w3-win8-crimson w3-padding'>
                <h3><BiError/>Error!</h3>
                <p>{message}</p>
            </div>
        </>
    );
}

ErrorPage2.propTypes = {
    message: stringPropType.isRequired
}

export default ErrorPage2;