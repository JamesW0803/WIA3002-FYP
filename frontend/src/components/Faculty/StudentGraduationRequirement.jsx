import { useOutletContext } from 'react-router-dom';
import { useState , useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { READABLE_COURSE_TYPES } from '../../constants/courseType';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  Skeleton
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CourseStatusBadge from '../../constants/courseStatusStyle';

const StudentGraduationRequirement = ({ programme_intake_id, academicProfile}) => {
  const [ programmeIntake, setProgrammeIntake ] = useState(null);
  const [ graduationRequirements, setGraduationRequirements ] = useState({});
  const [ coursesTaken, setCoursesTaken ] = useState([]);
  const [ loading , setLoading] = useState(true); 

  useEffect( () => {
    const fetchProgrammeIntake = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(`/programme-intakes/id/${programme_intake_id}`);
        setProgrammeIntake(response.data);
      } catch (error) {
        console.error("Error fetching programme intake:", error);
      } finally {
        setLoading(false);
      }
    }

    if(programme_intake_id) {
      fetchProgrammeIntake();
    }
  }, [programme_intake_id]);

  useEffect( () => {
    if(programmeIntake && programmeIntake.graduation_requirements){
      const graduation_requirements = programmeIntake.graduation_requirements;
      const coursesByCategory = graduation_requirements.reduce( (acc, course) => {
        if(!acc[course.type]){
          acc[course.type] = {};
          acc[course.type].courses = [];
          acc[course.type].requiredCredits = 0;
        }

        acc[course.type].courses.push(course);
        acc[course.type].requiredCredits += course.credit_hours;
        return acc;
      }, {});
      setGraduationRequirements(coursesByCategory);
    }
  }, [programmeIntake]);

  useEffect( () => {
    if(academicProfile && academicProfile.entries){
      const coursesObj = academicProfile.entries;
      const coursesByCategory = coursesObj.reduce( (acc, courseObj) => {
        const course = courseObj.course;
        if(!acc[course.type]){
          acc[course.type] = {};
          acc[course.type].courses = [];
          acc[course.type].completedCreditHours = 0;
        }

        acc[course.type].courses.push(courseObj);
        acc[course.type].completedCreditHours += course.credit_hours;
        return acc;
      }, {});
      setCoursesTaken(coursesByCategory);
      console.log(coursesByCategory);
    }
    
  }, [academicProfile]);

  if(loading){
    return (
      <Stack spacing={2} sx={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
        <Skeleton variant="text" height={30} />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={80} />
        ))}
      </Stack>
    )
  }

  return (
    <div style={{ width: '90%', margin: 'auto', marginTop: '2rem', paddingBottom: '2rem' }}>
        <Header programmeIntake={programmeIntake} academicProfile={academicProfile}/>
        <CourseAccordion graduationRequirements={graduationRequirements} coursesTaken={coursesTaken}/>
    </div>
  );
};

const Header = ({ programmeIntake , academicProfile}) => {
  return (
      <Typography variant="body1" gutterBottom style={{ marginBottom: '1.5rem' }}>
          Student has completed <span className='font-semibold'>{academicProfile.completed_credit_hours}</span> out of <span className='font-semibold'>{programmeIntake.total_credit_hours}</span>
          {" "}credit hours based on the minimum requirements for each course category.
      </Typography>
  )
}

const CourseAccordion = ({ graduationRequirements , coursesTaken }) => {
    return (
        <>
            {Object.entries(graduationRequirements).map(([type, data]) => {
              if(type === "total_credits_hours") return null;

              return (
                <Accordion key={type}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">
                    {READABLE_COURSE_TYPES[type]} {" "}
                    (<span className='font-semibold'>{coursesTaken[type]?.completedCreditHours || 0}</span> out of <span className='font-semibold'>{data.requiredCredits}</span> credit hours completed)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {data.courses.length > 0 ? (
                    data.courses.map((course, idx) => {
                      const courseObj = coursesTaken[type]?.courses?.find(courseTakenObj => courseTakenObj.course.course_code === course.course_code);
                      return (
                        <Typography
                          key={idx}
                          variant="body2"
                          style={{ marginBottom: "0.5rem" }} // adds spacing between lines
                        >
                          {course.course_code} {course.course_name}{" "}
                          <span style={{ marginLeft: "0.5rem" }}>
                            <CourseStatusBadge status={courseObj?.status || "Never Taken"} />
                          </span>
                        </Typography>
                        )})
                    ) : (
                    <Typography variant="body2" fontStyle="italic" color="text.secondary">
                        No courses listed
                    </Typography>
                    )}
                </AccordionDetails>
                </Accordion>
            )
            })}
        </>

    )
}

export default StudentGraduationRequirement;
