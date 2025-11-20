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
import CourseStatusBadge from '../../constants/courseStatusStyle';

const StudentGraduationRequirement = () => {
  const { programme_intake_id , academicProfile} = useOutletContext();
  const [ programmeIntake, setProgrammeIntake ] = useState(null);
  const [ graduationRequirements, setGraduationRequirements ] = useState({});
  const [ coursesTaken, setCoursesTaken ] = useState(academicProfile?.entries || []);

  useEffect( () => {
    const fetchProgrammeIntake = async () => {
      const response = await axiosClient.get(`/programme-intakes/id/${programme_intake_id}`);
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

        acc[course.type].courses.push(course);
        acc[course.type].requiredCredits += course.credit_hours;
        return acc;
      }, {});
      setGraduationRequirements(coursesByCategory);
    }
  }, [programmeIntake]);

  useEffect( () => {
    if(academicProfile && academicProfile.entries){
      setCoursesTaken(academicProfile.entries);
    }

  }, [academicProfile]);

  return (
    <div style={{ width: '80%', margin: 'auto', marginTop: '2rem' }}>
        <Header totalCreditHours={programmeIntake?.total_credits_hours}/>
        <CourseAccordion graduationRequirements={graduationRequirements} coursesTaken={coursesTaken}/>
    </div>
  );
};

const Header = ({ totalCreditHours }) => {
  return (
      <Typography variant="body2" gutterBottom>
          Student is required to complete a total of {totalCreditHours} credit hours by fulfilling
          the minimum credit requirements from each of the course categories listed
          below
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
                    {READABLE_COURSE_TYPES[type]} ({data.requiredCredits} credits required)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {data.courses.length > 0 ? (
                    data.courses.map((course, idx) => {
                      const courseObj = coursesTaken.find(courseTakenObj => courseTakenObj.course.course_code === course.course_code);
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
