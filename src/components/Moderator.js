/**
 * File: ./src/components/Moderator.js
 * Description: Provide a access to moderators only to moderation pages.
 * Date        Dev  Version  Description
 * 2024/05/08  ITA  1.00     Genesis.
 */
import { Outlet } from 'react-router-dom';
import { isModerator } from '../config/appConfig';
import { useState } from 'react';
import Registered from './Registered';

function Moderator() {
    const [mod] = useState(()=> {
        return (async()=> {
            return await isModerator();
        })();
    });

    return (
        <>
            {mod &&
                <Registered>
                    <Outlet/>
                </Registered>
            }
        </>
    );
}

export default Moderator;
