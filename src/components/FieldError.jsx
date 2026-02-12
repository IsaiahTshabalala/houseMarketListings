/**File: ./src/components/FieldError.jsx
 * An error component for display of errors below input components.
 * ================================================================================
 * Start Date  End Date    Dev    Description
 * 2026/01/06  2026/01/06  ITA    Genesis.
 */
import { BsCheck } from "react-icons/bs";
import { BiErrorCircle } from "react-icons/bi";
import { string as stringPropType } from 'prop-types';

/** An error component for display of errors below input components. */
export default function FieldError({ error }) {
    return (
        <>
        {error?
            <div className='w3-text-black'>
                <BiErrorCircle/>{error}
            </div>
            :       
            <div className='w3-text-black' style={{opacity: '0'}}>
                <BsCheck/>
            </div>
        }
        </>

    );
}

FieldError.propTypes = {
    error: stringPropType
};