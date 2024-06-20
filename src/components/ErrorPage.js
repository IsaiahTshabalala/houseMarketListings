/**
 * File: ./src/components/ErrorPage.js
 * Description: Error Page.
 * Date        Dev   Version   Description
 * 2023/07/27  ITA   1.00      Genesis.
 * 2024/06/18  ITA   1.01      Add header comment.
 *                             Change the Go Back link to the Home Page link.
 */
import { useParams, useNavigate } from "react-router-dom";
import { BiError } from "react-icons/bi";
import { FaHome } from "react-icons/fa";

function ErrorPage() {
    const parms = useParams();
    const navigate = useNavigate();

    return (
        <div className='w3-panel w3-win8-crimson w3-padding'>
            <h3><BiError/>Error!</h3>
            <p>{parms.message}</p>
        </div>
    );
} // function ErrorPage() {

export default ErrorPage;
