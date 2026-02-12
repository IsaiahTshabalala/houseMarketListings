/**
 * File: ./src/components/ErrorAlert.js
 * Description: Error Alert.
 * Start Date  End Date   Dev  Version Description
 * 2023/07/27             ITA  1.00    Genesis.
 * 2024/06/18             ITA  1.01    Add header comment.
 * 2026/01/06  2026/01/06 ITA  1.02    Imported the specific import, string, from prop-types
 */
import { string as stringPropType } from 'prop-types';
import { FaTimesCircle } from 'react-icons/fa';
import { useState } from 'react';

function Alert({message}) {
    const [isClosed, setIsClosed] = useState(false);
    return (
        (isClosed === false) &&
        <div className='w3-panel w3-win8-crimson'>
            <span onClick={e=> setIsClosed(true)}
                  className="w3-button w3-large w3-display-topright"><FaTimesCircle/></span>
            <h3>Error!</h3>
            <p>{message}</p>
        </div>
    );
}

Alert.propTypes = {
    message: stringPropType.isRequired
};

export default Alert;
