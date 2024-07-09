/**
 * File: ./src/components/ErrorPage.js
 * Description: Error Page.
 * Date        Dev   Version   Description
 * 2023/07/27  ITA   1.00      Genesis.
 * 2024/06/18  ITA   1.01      Add header comment.
 *                             Change the Go Back link to the Home Page link.
* 2024/0709    ITA   1.02      Remove un-used imports. Rename parms to params.
 */
import { useParams } from "react-router-dom";
import { BiError } from "react-icons/bi";

function ErrorPage() {
    const params = useParams();
    return (
        <div className='w3-panel w3-win8-crimson w3-padding'>
            <h3><BiError/>Error!</h3>
            <p>{params.message}</p>
        </div>
    );
} // function ErrorPage() {

export default ErrorPage;
