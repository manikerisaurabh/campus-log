import { getServerSession } from 'next-auth';
import StudentDetails from './StudentDetails';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import Student_Details from './StudentDetails';
import studentProtectRoute from '@/app/(components)/utils/protect-route/StudentProtectRoute';

const Home = async()=> {
    const session = await getServerSession(authOptions)
    console.log({session})
    return (
        <>
            {session?.user.id &&  <Student_Details id={session?.user.id} />}
           {/* <Student_Details id={'04766c58-d0b1-4786-a9a0-3f3d8594b88d'} /> */}
        </>
    );
}

export default studentProtectRoute(Home);