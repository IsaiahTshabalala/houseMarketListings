
import MenuBar from './components/MenuBar';
import SignIn from './components/SignIn';
import SignOut from './components/SignOut';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import Private from './components/Private';
import ErrorPage2 from './components/ErrorPage2';
import ErrorPage from './components/ErrorPage';
import SearchListings from './components/SearchListings';
import AccountInfo from './components/AccountInfo';
import EmailVerificationSentPage from './components/EmailVerificationSentPage';
import PasswordResetPage from './components/PasswordResetPage';
import './App.css';
import './index.css';
import { RouterProvider, createBrowserRouter, Outlet } from 'react-router-dom';
import UserProvider from './hooks/UserProvider';
import Heading from './components/Heading';
import MyListings from './components/MyListings';
import Listings from './components/Listings';
import Listing from './components/Listing';
import CurrentUserState from './components/CurrentUserState';
import CollectionsProvider from './hooks/CollectionsProvider';
import SharedVarsProvider from './hooks/SharedVarsProvider';
import AddOrEditListing from './components/AddOrEditListing';
import Explore from './components/Explore';

function App() {
    
    return (
        <UserProvider>
            <RouterProvider
                router = {
                    createBrowserRouter(
                    [
                        {
                            path: '/error/:message',
                            element: <ErrorPage/>
                        },
                        {
                            path: '/',
                            element:
                                    <>
                                        <MenuBar/>
                                        <CurrentUserState/>
                                        <Explore/>
                                    </>,
                            errorElement: <ErrorPage2 message='Path not found.'/>
                        },
                        {
                            path: '/search',
                            element:
                                    <>
                                        <MenuBar/>                                                    
                                        <CurrentUserState/>            
                                        <Outlet/>
                                    </>,
                            children: [
                                {
                                    path: '/search/',
                                    element: 
                                            /**All children of this component will share data such as selected provinces,
                                             * selected main places and selected sub-places. Also the queryed listings. 
                                             * Hence the SharedVarsProvider useContext hook.
                                              */
                                            <SharedVarsProvider>
                                                <Outlet/>
                                            </SharedVarsProvider>,
                                        children: [
                                            { 
                                                path: '/search/',
                                                element:
                                                        /**SearchListings component shares collections with its dropdown components within it.
                                                         * Hence the <CollectionsProvider/> useContext hook. */
                                                        <CollectionsProvider>
                                                            <>
                                                                <Heading title='Search for Property Listings'/>
                                                                <SearchListings/>
                                                            </>
                                                        </CollectionsProvider>
                                            },
                                            { 
                                                path: '/search/listings',
                                                element:
                                                        <Outlet/>,
                                                children: [
                                                    {
                                                        path: '/search/listings/',
                                                        element: 
                                                                <>
                                                                    <Heading title='Listings'/>
                                                                    <Listings/>
                                                                </>
                                                    },
                                                    {
                                                        path: '/search/listings/:listingId',
                                                        element:
                                                            /** The Listing components share sellers collection amongst themselves.
                                                             * Hence the CollectionsProvider useContext hook. */
                                                        <CollectionsProvider>
                                                            <Listing/>
                                                        </CollectionsProvider>
                                                    }
                                                ]
                                            },
                                            {
                                                path: '/search/offers',
                                                element:
                                                        <Outlet/>,
                                                children: [
                                                    {
                                                        path: '/search/offers/',
                                                        element: 
                                                                /**SearchListings component shares collections (provinces, municipalities, main places, sub-places)
                                                                 * with its dropdown components within it. Hence the <CollectionsProvider/> useContext hook. */
                                                                <CollectionsProvider>
                                                                    <>
                                                                        <Heading title='Search for Property Listings with Discounts'/>
                                                                        <SearchListings/>
                                                                    </>
                                                                </CollectionsProvider>
                                                    },
                                                    {
                                                        path: '/search/offers/listings',
                                                        element: 
                                                                <Outlet/>,
                                                        children: [
                                                            {
                                                                path: '/search/offers/listings/',
                                                                element: <Listings/>
                                                            },
                                                            {
                                                                path: '/search/offers/listings/:listingId',
                                                                element: 
                                                                        /**The Listing components share the sellers collection amongst them. */
                                                                        <CollectionsProvider>
                                                                            <Listing/>
                                                                        </CollectionsProvider>
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]

                                }
                            ],
                            errorElement: <ErrorPage2 message='Path not found.'/>
                        },
                        {
                            path: '/signin',
                            element: <SignIn/>
                        },
                        {
                            path: '/signout',
                            element: <SignOut/>
                        },
                        {
                            path: '/register',
                            element: <Register/>
                        },
                        {
                            path: '/email-verification-sent',
                            element: <EmailVerificationSentPage/>
                        },
                        {
                            path: '/error/auth/email-already-in-use',
                            element: <ErrorPage2 message='There is already an account registered with this email!'/>
                        },
                        {
                            path: '/forgot-password',
                            element: <ForgotPassword/>
                        },
                        {
                            path: '/password-reset',
                            element: <PasswordResetPage/>
                        },
                        {
                            path: '/my-profile',
                            element:
                                    <>
                                        <MenuBar/>
                                        <CurrentUserState/>
                                        <Private/>
                                    </>,
                            children: [
                                {
                                    path: 'account',
                                    element: /**The AccountInfo component shares the collections (provinces, municipalities, main places, sub-places)
                                                with its dropdowns. Hence the CollectionProvider hook. */
                                            <CollectionsProvider>
                                                <AccountInfo/>
                                            </CollectionsProvider>
                                },
                                {
                                    path: 'listings',
                                    element:
                                            /**MyListings and Listing components share the clickedListing shared variable.
                                             * Hence the SharedVarsProvider useContext hook.
                                             * The 
                                            */
                                            <SharedVarsProvider>
                                                <Outlet/>
                                            </SharedVarsProvider>,
                                    children: [
                                        {
                                            path: '/my-profile/listings',
                                            element: <MyListings/>
                                        },
                                        {
                                            path: '/my-profile/listings/:listingId',
                                            element: /** The Listing components share the sellers collection amongst themselves.
                                                         Hence the CollectionsProvider */
                                                    <CollectionsProvider>
                                                        <Listing/>
                                                    </CollectionsProvider>
                                        },
                                        {
                                            path: '/my-profile/listings/:listingId/edit',
                                            element: /**The AddOrEditListing component shares collections (provinces, municipalities, main places, sub-place)
                                                        with its dropdowns. Hence the CollectionsProvider useContext hook. */
                                                    <CollectionsProvider>
                                                        <AddOrEditListing/>
                                                    </CollectionsProvider>
                                        },
                                        {
                                            path: '/my-profile/listings/new',
                                            element: /**AddOrEditListing component shares collections (provinces, municipalities, main places, sub-places)
                                                         with its dropdowns. */
                                                    <CollectionsProvider>
                                                        <AddOrEditListing/>
                                                    </CollectionsProvider>
                                        }
                                    ]
                                }
                            ]                            
                        }
                    ])
                }
            />
        </UserProvider>
    );
}

export default App;
