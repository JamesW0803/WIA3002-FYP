const FACULTY_CORE = "faculty_core";
const PROGRAMME_CORE = "programme_core";
const PROGRAMME_ELECTIVE = "programme_elective";
const UNIVERSITY_LANGUAGE = "university_language";
const UNIVERSITY_COCURRICULUM = "university_cocurriculum";
const UNIVERSITY_OTHER = "university_other";
const SHE_CLUSTER_1 = "she_cluster_1";
const SHE_CLUSTER_2 = "she_cluster_2";
const SHE_CLUSTER_3 = "she_cluster_3";
const SHE_CLUSTER_4 = "she_cluster_4";
const UNKNOWN = "Unknown";

const COURSE_TYPES = [
    FACULTY_CORE,
    PROGRAMME_CORE,
    PROGRAMME_ELECTIVE,
    UNIVERSITY_LANGUAGE,
    UNIVERSITY_COCURRICULUM,
    UNIVERSITY_OTHER,
    SHE_CLUSTER_1,
    SHE_CLUSTER_2,
    SHE_CLUSTER_3,
    SHE_CLUSTER_4
]

const READABLE_COURSE_TYPES = {
    [FACULTY_CORE]: "Faculty Core Course",
    [PROGRAMME_CORE]: "Programme Core Course",
    [PROGRAMME_ELECTIVE]: "Programme Elective Course",
    [UNIVERSITY_LANGUAGE]: "University Language Course",
    [UNIVERSITY_COCURRICULUM]: "University Co-curriculum Course",
    [UNIVERSITY_OTHER]: "University Other Course",
    [SHE_CLUSTER_1]: "Cluster 1 SHE Course",
    [SHE_CLUSTER_2]: "Cluster 2 SHE Course",
    [SHE_CLUSTER_3]: "Cluster 3 SHE Course",
    [SHE_CLUSTER_4]: "Cluster 4 SHE Course",
    [UNKNOWN]: "Unknown Course Type"
}

module.exports = {
    FACULTY_CORE,
    PROGRAMME_CORE,
    PROGRAMME_ELECTIVE,
    UNIVERSITY_LANGUAGE,
    UNIVERSITY_COCURRICULUM,
    UNIVERSITY_OTHER,
    SHE_CLUSTER_1,
    SHE_CLUSTER_2,
    SHE_CLUSTER_3,
    SHE_CLUSTER_4,
    UNKNOWN,
    COURSE_TYPES,
    READABLE_COURSE_TYPES,
}
