import { useOutletContext } from 'react-router-dom';
import { useState , useEffect } from 'react';
import axiosClient from '../../api/axiosClient';
import { READABLE_COURSE_TYPES } from '../../constants/courseType';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const StudentGraduationRequirement = () => {
    const { programme_intake_id } = useOutletContext();
  const [ programmeIntake, setProgrammeIntake ] = useState(null);
  const [ graduationRequirements, setGraduationRequirements ] = useState({});

  useEffect( () => {
    const fetchProgrammeIntake = async () => {
      const response = await axiosClient.get(`/programme-intakes/${programme_intake_id}`);
      setProgrammeIntake(response.data);
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

        if(!acc["total_credits_hours"]){
          acc["total_credits_hours"] = 0;
        }

        acc[course.type].courses.push(course);
        acc[course.type].requiredCredits += course.credit_hours;
        acc["total_credits_hours"] += course.credit_hours;
        return acc;
      }, {});
      setGraduationRequirements(coursesByCategory);
    }
  }, [programmeIntake]);

  return (
    <div style={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
        <Header totalCreditHours={graduationRequirements.total_credits_hours}/>
        <CourseAccordion graduationRequirements={graduationRequirements}/>
    </div>
  );
};

const Header = ({ totalCreditHours }) => {
  return (
      <Typography variant="body2" gutterBottom>
          Students are required to complete a total of {totalCreditHours} credit hours by fulfilling
          the minimum credit requirements from each of the course categories listed
          below
      </Typography>
  )
}

const CourseAccordion = ({ graduationRequirements }) => {
    return (
        <>
            {Object.entries(graduationRequirements).map(([type, data]) => {
              if(type === "total_credits_hours") return null;

              return (
                <Accordion key={type}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography fontWeight="bold">
                    {READABLE_COURSE_TYPES[type]} ({data.requiredCredits} credits required)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {data.courses.length > 0 ? (
                    data.courses.map((course, idx) => (
                        <Typography key={idx} variant="body2">
                        {course.course_code} {course.course_name}
                        </Typography>
                    ))
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
