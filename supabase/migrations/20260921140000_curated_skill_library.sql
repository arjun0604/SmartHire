INSERT INTO skills (name)
SELECT s.name
FROM (
    VALUES
        ('Vue.js'),
        ('Angular'),
        ('C#'),
        ('Ruby on Rails'),
        ('Ruby'),
        ('HTML5'),
        ('CSS3'),
        ('Apache Kafka'),
        ('Elasticsearch'),
        ('RabbitMQ'),
        ('Postman'),
        ('Sass'),
        ('Jenkins'),
        ('Ansible')
) AS s(name)
WHERE NOT EXISTS (
    SELECT 1 FROM skills WHERE LOWER(TRIM(skills.name)) = LOWER(TRIM(s.name))
);

DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN (
        SELECT s_red.id AS redundant_id, s_canon.id AS canonical_id
        FROM (
            VALUES
                ('Node', 'Node.js'),
                ('NodeJS', 'Node.js'),
                ('Node JS', 'Node.js'),
                ('React.js', 'React'),
                ('ReactJS', 'React'),
                ('React JS', 'React'),
                ('Postgres', 'PostgreSQL'),
                ('Postgre SQL', 'PostgreSQL'),
                ('Postgresql', 'PostgreSQL'),
                ('K8s', 'Kubernetes'),
                ('Vue', 'Vue.js'),
                ('VueJS', 'Vue.js'),
                ('Vue JS', 'Vue.js'),
                ('AngularJS', 'Angular'),
                ('Angular.js', 'Angular'),
                ('CSharp', 'C#'),
                ('C Sharp', 'C#'),
                ('Golang', 'Go'),
                ('CPP', 'C++'),
                ('Rails', 'Ruby on Rails'),
                ('RoR', 'Ruby on Rails'),
                ('HTML', 'HTML5'),
                ('CSS', 'CSS3'),
                ('Kafka', 'Apache Kafka'),
                ('Elastic Search', 'Elasticsearch'),
                ('Rabbit MQ', 'RabbitMQ'),
                ('SCSS', 'Sass')
        ) AS m(redundant_name, canonical_name)
        JOIN skills s_red ON LOWER(TRIM(s_red.name)) = LOWER(TRIM(m.redundant_name))
        JOIN skills s_canon ON LOWER(TRIM(s_canon.name)) = LOWER(TRIM(m.canonical_name))
        WHERE s_red.id != s_canon.id
    ) LOOP
        DELETE FROM candidate_skills
        WHERE skill_id = rec.redundant_id
          AND candidate_id IN (
              SELECT candidate_id FROM candidate_skills WHERE skill_id = rec.canonical_id
          );

        UPDATE candidate_skills
        SET skill_id = rec.canonical_id
        WHERE skill_id = rec.redundant_id;

        UPDATE job_skills
        SET is_required = TRUE
        WHERE skill_id = rec.canonical_id
          AND job_id IN (
              SELECT job_id FROM job_skills WHERE skill_id = rec.redundant_id AND is_required = TRUE
          );

        DELETE FROM job_skills
        WHERE skill_id = rec.redundant_id
          AND job_id IN (
              SELECT job_id FROM job_skills WHERE skill_id = rec.canonical_id
          );

        UPDATE job_skills
        SET skill_id = rec.canonical_id
        WHERE skill_id = rec.redundant_id;

        UPDATE skill_aliases
        SET skill_id = rec.canonical_id
        WHERE skill_id = rec.redundant_id;

        DELETE FROM skills
        WHERE id = rec.redundant_id;
    END LOOP;
END $$;

INSERT INTO skill_aliases (skill_id, alias, normalized_alias)
SELECT s.id, a.alias, a.normalized_alias
FROM (
    VALUES
        ('Node.js', 'Node', 'node'),
        ('Node.js', 'NodeJS', 'nodejs'),
        ('Node.js', 'Node JS', 'node js'),
        ('React', 'React.js', 'react.js'),
        ('React', 'ReactJS', 'reactjs'),
        ('React', 'React JS', 'react js'),
        ('PostgreSQL', 'Postgres', 'postgres'),
        ('PostgreSQL', 'Postgre SQL', 'postgre sql'),
        ('PostgreSQL', 'Postgresql', 'postgresql'),
        ('Kubernetes', 'K8s', 'k8s'),
        ('Vue.js', 'Vue', 'vue'),
        ('Vue.js', 'VueJS', 'vuejs'),
        ('Vue.js', 'Vue JS', 'vue js'),
        ('Angular', 'AngularJS', 'angularjs'),
        ('Angular', 'Angular.js', 'angular.js'),
        ('C#', 'CSharp', 'csharp'),
        ('C#', 'C Sharp', 'c sharp'),
        ('Go', 'Golang', 'golang'),
        ('C++', 'CPP', 'cpp'),
        ('Ruby on Rails', 'Rails', 'rails'),
        ('Ruby on Rails', 'RoR', 'ror'),
        ('HTML5', 'HTML', 'html'),
        ('CSS3', 'CSS', 'css'),
        ('Apache Kafka', 'Kafka', 'kafka'),
        ('Elasticsearch', 'Elastic Search', 'elastic search'),
        ('RabbitMQ', 'Rabbit MQ', 'rabbit mq'),
        ('Sass', 'SCSS', 'scss'),
        ('Java', 'Core Java', 'core java')
) AS a(skill_name, alias, normalized_alias)
JOIN skills s ON LOWER(TRIM(s.name)) = LOWER(TRIM(a.skill_name))
ON CONFLICT (normalized_alias) DO NOTHING;
